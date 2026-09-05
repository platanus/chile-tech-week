// The socket: one Action Cable subscription to FlockChannel, as a pilot or a spectator. Action
// Cable is imported lazily so the landing's first paint and SSR never load it.
import type { Consumer, Subscription } from '@rails/actioncable';
import type { Frame, MoveMessage, Role } from './protocol';

export interface FlockEvents {
  onFrame(frame: Frame): void;
  onConnected(): void;
  onDisconnected(): void;
  onRejected(): void;
}

export class FlockClient {
  private consumer: Consumer | null = null;
  private subscription: Subscription | null = null;
  private generation = 0;

  async connect(role: Role, events: FlockEvents) {
    this.disconnect();
    const gen = ++this.generation;
    const { createConsumer } = await import('@rails/actioncable');
    if (gen !== this.generation) return; // superseded while the module loaded
    this.consumer = createConsumer();
    this.subscription = this.consumer.subscriptions.create(
      { channel: 'FlockChannel', role },
      {
        received: (data: Frame) => events.onFrame(data),
        connected: () => events.onConnected(),
        disconnected: () => events.onDisconnected(),
        rejected: () => events.onRejected(),
      },
    );
  }

  disconnect() {
    this.generation++;
    this.subscription?.unsubscribe();
    this.consumer?.disconnect();
    this.subscription = null;
    this.consumer = null;
  }

  get connected() {
    return this.subscription !== null;
  }

  move(message: MoveMessage) {
    this.subscription?.perform('move', message);
  }
}

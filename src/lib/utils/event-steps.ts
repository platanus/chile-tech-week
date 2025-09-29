import type { Event } from '@/src/lib/db/schema';

export function getCurrentEventStep(event: Event): number {
  switch (event.state) {
    case 'submitted':
      // Check if it has been approved (step 2) or still waiting for approval (step 1)
      return event.approvedAt ? 2 : 1;
    case 'waiting-luma-edit':
      // Event is approved and now in Luma editing phase
      return 3;
    case 'published':
      return 4;
    case 'rejected':
    case 'deleted':
      return 1;
    default:
      return 1;
  }
}

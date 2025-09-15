import { SlackClient } from '@/src/clients/slack';
import { isDevelopmentEnvironment } from '@/src/lib/constants';

export class SlackService {
  private client: SlackClient;
  private isDevelopment: boolean;
  private channel: string;

  constructor() {
    this.isDevelopment = isDevelopmentEnvironment;

    // Get bot token and appropriate channel based on environment
    const botToken = process.env.SLACK_BOT_TOKEN;
    this.channel = this.isDevelopment
      ? process.env.SLACK_CHANNEL_DEV || '#dev-notifications'
      : process.env.SLACK_CHANNEL_PROD || '#prod-notifications';

    if (!botToken) {
      console.warn('Slack bot token not configured');
    }

    this.client = new SlackClient(botToken || '');
  }

  async sendMessage(message: string): Promise<void> {
    try {
      await this.client.sendPlainMessage({
        channel: this.channel,
        message: message,
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      // Don't throw error to prevent breaking the main flow
    }
  }
}

// Export a singleton instance
export const slackService = new SlackService();

import { LumaClient } from '@/src/clients/luma';
import type { CreateEventFormData } from '@/src/lib/schemas/events.schema';

export class LumaService {
  private client: LumaClient;

  constructor() {
    // Get API key from environment
    const apiKey = process.env.LUMA_API_KEY;

    if (!apiKey) {
      console.warn('Luma API key not configured');
    }

    this.client = new LumaClient(apiKey || '');
  }

  /**
   * Test the Luma API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.getSelf();
      return true;
    } catch (error) {
      console.error('Luma API connection test failed:', error);
      return false;
    }
  }

  /**
   * Create an event on Luma based on the form data
   */
  async createEventFromFormData(formData: CreateEventFormData): Promise<{
    success: boolean;
    eventUrl?: string;
    eventApiId?: string;
    error?: string;
    cohostResult?: {
      success: boolean;
      successful_count: number;
      failed_count: number;
      results: Array<{
        email: string;
        success: boolean;
        error?: string;
      }>;
    };
  }> {
    try {
      // Calculate duration in minutes
      const durationMs =
        formData.endDate.getTime() - formData.startDate.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      // Prepare co-host emails including the primary contact
      const cohostEmails = [
        formData.authorEmail, // Add primary contact as co-host
        ...(formData.cohosts
          ?.map((cohost) => cohost.primaryContactEmail)
          .filter(Boolean) || []),
      ];

      // Create event data for Luma API
      const eventData = {
        name: formData.title,
        start_at: formData.startDate.toISOString(),
        duration_minutes: durationMinutes,
        description: this.generateEventDescription(formData),
        location: formData.commune,
        timezone: 'America/Santiago', // Chile timezone
        require_rsvp: true,
        require_rsvp_approval: false, // Can be configured based on requirements
        visibility: 'private' as const, // Make events private/hidden by default
        capacity: formData.capacity, // Set the event capacity
        // ...(formData.companyLogoUrl && { cover_url: formData.companyLogoUrl }),
      };

      // Create event with co-hosts
      const result = await this.client.createEventWithCoHosts({
        eventData,
        cohostEmails,
      });

      console.log('Luma event created:', result);
      console.log('Full event object:', JSON.stringify(result.event, null, 2));

      return {
        success: true,
        eventUrl: result.event.url,
        eventApiId: result.event.api_id,
        cohostResult: result.cohostResult
          ? {
              success: result.cohostResult.success,
              successful_count: result.cohostResult.successful_count,
              failed_count: result.cohostResult.failed_count,
              results: result.cohostResult.results,
            }
          : undefined,
      };
    } catch (error) {
      console.error('Failed to create Luma event:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate a formatted description for the Luma event
   */
  private generateEventDescription(formData: CreateEventFormData): string {
    const parts: string[] = [];

    // Add organizer information
    parts.push(
      `Organized by: ${formData.authorName} (${formData.authorEmail})`,
    );

    // Add event format
    parts.push(`Format: ${formData.format}`);

    // Add co-hosts information if any
    if (formData.cohosts && formData.cohosts.length > 0) {
      parts.push('\nCo-hosts:');
      formData.cohosts.forEach((cohost, index) => {
        parts.push(
          `${index + 1}. ${cohost.companyName} - ${cohost.primaryContactName} (${cohost.primaryContactEmail})`,
        );
      });
    }

    // Add original Luma link if provided
    if (formData.lumaLink) {
      parts.push(`\nOriginal Luma Link: ${formData.lumaLink}`);
    }

    // Add contact information
    if (formData.authorPhoneNumber) {
      parts.push(`\nContact: ${formData.authorPhoneNumber}`);
    }

    parts.push(
      '\n---\nThis event was created through Chile Tech Week event submission system.',
    );

    return parts.join('\n');
  }

  /**
   * Add additional co-hosts to an existing event
   */
  async addCoHostsToEvent(params: {
    eventApiId: string;
    emails: string[];
  }): Promise<{
    success: boolean;
    successful_count: number;
    failed_count: number;
    results: Array<{
      email: string;
      success: boolean;
      error?: string;
    }>;
    error?: string;
  }> {
    try {
      const result = await this.client.addCoHosts({
        eventApiId: params.eventApiId,
        emails: params.emails,
      });

      return {
        success: result.success,
        successful_count: result.successful_count,
        failed_count: result.failed_count,
        results: result.results,
      };
    } catch (error) {
      console.error('Failed to add co-hosts to Luma event:', error);
      return {
        success: false,
        successful_count: 0,
        failed_count: params.emails.length,
        results: params.emails.map((email) => ({
          email,
          success: false,
          error: 'Failed to add host',
        })),
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export a singleton instance
export const lumaService = new LumaService();

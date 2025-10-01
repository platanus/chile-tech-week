import { LumaClient } from '@/src/clients/luma';
import { isDevelopmentEnvironment } from '@/src/lib/constants';
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
  async createEventFromFormData(
    formData: CreateEventFormData,
    eventId?: string,
  ): Promise<{
    eventUrl: string;
    eventApiId: string;
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
    // Prepare co-host emails including the primary contact
    let cohostEmails = [
      formData.authorEmail, // Add primary contact as co-host
      ...(formData.cohosts
        ?.map((cohost) => cohost.primaryContactEmail)
        .filter(Boolean) || []),
    ];

    // In development, filter co-hosts by allowed emails
    if (isDevelopmentEnvironment) {
      const allowedEmails = process.env.LUMA_ALLOWED_COHOST_DEV?.split(',')
        .map((email) => email.trim())
        .filter(Boolean);

      if (allowedEmails && allowedEmails.length > 0) {
        cohostEmails = cohostEmails.filter((email) =>
          allowedEmails.includes(email),
        );
        console.log(
          'Development mode: Filtered co-hosts to allowed emails:',
          cohostEmails,
        );
      }
    }

    // Create geo_address_json with commune information
    const geoAddress = {
      type: 'manual' as const,
      address: formData.commune,
    };

    // Create event data for Luma API
    const eventData = {
      name: formData.title,
      start_at: formData.startDate.toISOString(),
      end_at: formData.endDate.toISOString(),
      cover_url: process.env.LUMA_COVER_URL,
      description_md: this.generateEventDescription(formData, eventId),
      tint_color: '#ee2b2b',
      location: formData.commune,
      geo_address_json: geoAddress,
      timezone: 'America/Santiago',
      visibility: 'private' as const,
      capacity: formData.capacity,
    };

    // Create event with co-hosts
    const result = await this.client.createEventWithCoHosts({
      eventData,
      cohostEmails,
    });

    console.log('Luma event created:', result);
    console.log('Full event object:', JSON.stringify(result, null, 2));

    // Try to fetch the full event details to get the actual URL
    // If this fails, fall back to the URL from the create response
    let eventUrl = result.event.url;
    try {
      const eventDetails = await this.client.getEvent(result.event.api_id);
      console.log('Event details fetched:', eventDetails);
      console.log('Event URL from get call:', eventDetails.url);
      eventUrl = eventDetails.url;
    } catch (error) {
      console.warn(
        'Failed to fetch event details, using URL from create response:',
        error,
      );
    }

    return {
      eventUrl: eventUrl,
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
  }

  /**
   * Generate a formatted Markdown description for the Luma event
   */
  public generateEventDescription(
    formData: CreateEventFormData,
    eventId?: string,
  ): string {
    const parts: string[] = [];

    // Add template editing warning with markdown styling
    parts.push('## ⚠️ RECUERDA EDITAR ESTA DESCRIPCIÓN ⚠️');
    parts.push('');
    parts.push('### CHECKLIST DE EDICIÓN:');
    parts.push('- [ ] Verificar horario y fecha del evento');
    parts.push('- [ ] Agregar imágenes del evento');
    parts.push('- [ ] Verificar ubicación del evento');
    parts.push(
      '- [ ] [Editar perfil de Luma](https://luma.com/settings) con nombre y logo de empresa',
    );
    parts.push('');

    // Add event descriptions with proper markdown formatting
    parts.push('## DESCRIPCIÓN EN ESPAÑOL');
    parts.push(formData.description || '*Descripción pendiente de editar*');
    parts.push('');
    parts.push('## ENGLISH DESCRIPTION');
    parts.push(formData.description || '*Description pending edit*');
    parts.push('');

    // Add event status link with markdown formatting
    if (eventId) {
      parts.push(
        `🚀 [Cuando completes los pasos, publica el evento aquí](https://${process.env.DOMAIN}/events/${eventId}/status)`,
      );
      parts.push('');
    }

    // Add separator
    parts.push('---');
    parts.push('');
    parts.push('## INFORMACIÓN ORGANIZACIONAL');
    parts.push('');

    // Add organizer information with markdown formatting
    parts.push(
      `**Organizer:** ${formData.authorName} (${formData.authorEmail})`,
    );
    parts.push(`**Format:** ${formData.format}`);

    // Add co-hosts information if any
    if (formData.cohosts && formData.cohosts.length > 0) {
      parts.push('');
      parts.push('**Co-hosts:**');
      formData.cohosts.forEach((cohost, index) => {
        parts.push(
          `${index + 1}. **${cohost.companyName}** - ${cohost.primaryContactName} (${cohost.primaryContactEmail})`,
        );
      });
    }

    // Add contact information
    if (formData.authorPhoneNumber) {
      parts.push('');
      parts.push(`**Contact:** ${formData.authorPhoneNumber}`);
    }

    parts.push('');
    parts.push('---');
    parts.push(
      '*This event was created through Chile Tech Week event submission system.*',
    );
    parts.push('');
    parts.push('⚠️ FIN DE DESCRIPCIÓN AUTOGENERADA - ELIMINAR ESTA PARTE ⚠️');

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
  }> {
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
  }

  /**
   * Get event details from Luma
   */
  async getEvent(eventApiId: string) {
    return this.client.getEvent(eventApiId);
  }

  /**
   * Update event visibility to public
   */
  async updateEventVisibility(
    eventApiId: string,
    visibility: 'public' | 'private' | 'member-only',
  ): Promise<void> {
    await this.client.updateEvent(eventApiId, { visibility });
  }
}

// Export a singleton instance
export const lumaService = new LumaService();

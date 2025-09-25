interface LumaEventRequest {
  name: string;
  start_at: string; // ISO 8601 format
  duration_minutes: number;
  description_md?: string; // Markdown description field
  cover_url?: string;
  require_rsvp?: boolean;
  require_rsvp_approval?: boolean;
  visibility?: 'public' | 'private' | 'member-only';
  zoom_creation_method?:
    | 'created-automatically'
    | 'existing-attached'
    | 'manually-entered';
  zoom_meeting_id?: string;
  zoom_meeting_password?: string;
  zoom_meeting_url?: string;
  zoom_session_type?: string;
  community_api_id?: string;
  location?: string;
  geo_address_json?: {
    type: 'manual';
    address: string;
  }; // Manual address object
  timezone?: string;
  capacity?: number; // Maximum number of attendees
}

interface LumaEventResponse {
  api_id: string;
  name: string;
  start_at: string;
  duration_minutes: number;
  url: string;
  cover_url?: string;
  description_md?: string; // Markdown description field
  location?: string;
  timezone: string;
  require_rsvp: boolean;
  require_rsvp_approval: boolean;
  created_at: string;
  updated_at: string;
}

interface LumaAddHostResponse {
  success: boolean;
  message?: string;
}

interface LumaUserResponse {
  api_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export class LumaClient {
  private apiKey: string;
  private baseUrl = 'https://public-api.luma.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
    } = {},
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Luma API key is not configured');
    }

    const { method = 'GET', body } = options;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-luma-api-key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Luma API error (${response.status}): ${errorText || 'Unknown error'}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to make Luma API request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Test the API connection by getting current user info
   */
  async getSelf(): Promise<LumaUserResponse> {
    return this.makeRequest<LumaUserResponse>('/user/get-self');
  }

  /**
   * Get event details by event API ID
   * Note: This endpoint may not be publicly available in the Luma API
   */
  async getEvent(eventApiId: string): Promise<LumaEventResponse> {
    return this.makeRequest<LumaEventResponse>(
      `/event/get?event_api_id=${eventApiId}`,
    );
  }

  /**
   * Create a new event on Luma
   */
  async createEvent(eventData: LumaEventRequest): Promise<LumaEventResponse> {
    return this.makeRequest<LumaEventResponse>('/event/create', {
      method: 'POST',
      body: eventData,
    });
  }

  /**
   * Add a host to an event
   */
  async addHost(eventId: string, email: string): Promise<LumaAddHostResponse> {
    return this.makeRequest<LumaAddHostResponse>('/event/add-host', {
      method: 'POST',
      body: {
        event_api_id: eventId,
        email: email,
      },
    });
  }

  /**
   * Add multiple co-hosts to an event by their email addresses
   */
  async addCoHosts(params: { eventApiId: string; emails: string[] }): Promise<{
    success: boolean;
    results: Array<{
      email: string;
      success: boolean;
      error?: string;
    }>;
    successful_count: number;
    failed_count: number;
  }> {
    const { eventApiId, emails } = params;
    const results: Array<{
      email: string;
      success: boolean;
      error?: string;
    }> = [];

    // Add each host individually since the API expects one email per request
    for (const email of emails) {
      try {
        await this.addHost(eventApiId, email);
        results.push({ email, success: true });
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful_count = results.filter((r) => r.success).length;
    const failed_count = results.filter((r) => !r.success).length;

    return {
      success: successful_count > 0,
      results,
      successful_count,
      failed_count,
    };
  }

  /**
   * Create an event with co-hosts in one operation
   */
  async createEventWithCoHosts(params: {
    eventData: LumaEventRequest;
    cohostEmails: string[];
  }): Promise<{
    event: LumaEventResponse;
    cohostResult?: {
      success: boolean;
      results: Array<{
        email: string;
        success: boolean;
        error?: string;
      }>;
      successful_count: number;
      failed_count: number;
    };
  }> {
    const { eventData, cohostEmails } = params;

    // First create the event
    const event = await this.createEvent(eventData);

    // Then add co-hosts if any are provided
    let cohostResult:
      | {
          success: boolean;
          results: Array<{
            email: string;
            success: boolean;
            error?: string;
          }>;
          successful_count: number;
          failed_count: number;
        }
      | undefined;

    if (cohostEmails.length > 0) {
      try {
        cohostResult = await this.addCoHosts({
          eventApiId: event.api_id,
          emails: cohostEmails,
        });
      } catch (error) {
        console.error('Failed to add co-hosts to event:', error);
        // Don't throw here - the event was created successfully
        // We'll return the partial result
      }
    }

    return {
      event,
      cohostResult,
    };
  }
}

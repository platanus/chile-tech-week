import { parsePhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

import { eventFormats } from '@/src/lib/db/schema';

// Helper function to titleize names (e.g., "rodrigo peña" => "Rodrigo Peña")
function titleize(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper function to capitalize titles (same as titleize for now)
function capitalize(str: string): string {
  return titleize(str);
}

// Helper function to validate international phone numbers
function validateInternationalPhone(phone: string): boolean {
  if (!phone || phone.trim() === '') {
    return false;
  }

  try {
    const parsed = parsePhoneNumber(phone);
    return parsed ? parsed.isValid() : false;
  } catch {
    return false;
  }
}

export const createEventFormSchema = z
  .object({
    // Author information
    authorEmail: z
      .string()
      .email('Please enter a valid email address')
      .max(255, 'Email is too long'),
    authorName: z
      .string()
      .min(1, 'Author name is required')
      .max(255, 'Author name is too long')
      .transform(titleize),
    companyName: z
      .string()
      .min(1, 'Company name is required')
      .max(255, 'Company name is too long'),
    companyWebsite: z
      .string()
      .min(1, 'Company website is required')
      .max(500, 'Website URL is too long')
      .refine((url) => url.startsWith('https://'), {
        message: 'URL is missing https://',
      })
      .refine(
        (url) => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        {
          message: 'Please enter a valid URL',
        },
      ),
    authorPhoneNumber: z
      .string()
      .min(1, 'Phone number is required')
      .max(50, 'Phone number is too long')
      .refine(validateInternationalPhone, {
        message:
          'Please enter a valid international phone number (e.g., +56 9 8765 4321 or +1 555 123 4567)',
      }),

    // Event details
    title: z
      .string()
      .min(1, 'Event title is required')
      .max(500, 'Event title is too long')
      .transform(capitalize),
    description: z
      .string()
      .min(1, 'Event description is required')
      .max(300, 'Event description must be 300 characters or less'),
    startDate: z
      .date({
        required_error: 'Start date is required',
        invalid_type_error: 'Please enter a valid start date',
      })
      .refine(
        (date) => {
          const techWeekStart = new Date('2025-11-17');
          const techWeekEnd = new Date('2025-11-24'); // End of Sunday
          return date >= techWeekStart && date < techWeekEnd;
        },
        {
          message:
            'Event must be scheduled during Chile Tech Week (Nov 17-23, 2025)',
        },
      ),
    endDate: z
      .date({
        required_error: 'End date is required',
        invalid_type_error: 'Please enter a valid end date',
      })
      .refine(
        (date) => {
          const techWeekStart = new Date('2025-11-17');
          const techWeekEnd = new Date('2025-11-24'); // End of Sunday
          return date >= techWeekStart && date < techWeekEnd;
        },
        {
          message: 'Event must end during Chile Tech Week (Nov 17-23, 2025)',
        },
      ),

    // Location
    commune: z
      .string()
      .min(1, 'Commune is required')
      .max(255, 'Commune name is too long'),

    // Event properties
    format: z.enum(eventFormats, {
      required_error: 'Please select an event format',
    }),
    capacity: z
      .number()
      .int('Capacity must be a whole number')
      .min(1, 'Capacity must be at least 1 person')
      .max(500000, 'Capacity cannot exceed 500,000 people'),
    companyLogoUrl: z
      .string()
      .min(1, 'Company logo is required')
      .url('Please enter a valid URL')
      .max(500, 'Company logo URL is too long'),

    // Logo file (required for generating URL)
    logoFile: z
      .instanceof(File)
      .refine((file) => file.size > 0, {
        message: 'Please select a logo file',
      })
      .refine((file) => file.size >= 1024, {
        message: 'Logo file is too small (minimum 1KB)',
      })
      .refine((file) => file.size <= 2 * 1024 * 1024, {
        message: 'Logo must be less than 2MB',
      })
      .refine((file) => file.type.startsWith('image/'), {
        message: 'Logo must be an image file',
      })
      .refine(
        (file) =>
          ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
            file.type,
          ),
        {
          message: 'Logo must be JPEG, PNG, or WebP format',
        },
      ),

    // Co-hosts (optional array)
    cohosts: z
      .array(
        z.object({
          companyName: z
            .string()
            .min(1, 'Company name is required')
            .max(255, 'Company name is too long'),
          companyLogoUrl: z
            .string()
            .min(1, 'Company logo is required')
            .url('Please enter a valid URL')
            .max(500, 'Company logo URL is too long'),
          logoFile: z
            .instanceof(File)
            .refine((file) => file.size > 0, {
              message: 'Please select a logo file',
            })
            .refine((file) => file.size >= 1024, {
              message: 'Logo file is too small (minimum 1KB)',
            })
            .refine((file) => file.size <= 2 * 1024 * 1024, {
              message: 'Logo must be less than 2MB',
            })
            .refine((file) => file.type.startsWith('image/'), {
              message: 'Logo must be an image file',
            })
            .refine(
              (file) =>
                ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
                  file.type,
                ),
              {
                message: 'Logo must be JPEG, PNG, or WebP format',
              },
            ),
          primaryContactName: z
            .string()
            .min(1, 'Primary contact name is required')
            .max(255, 'Primary contact name is too long')
            .transform(titleize),
          primaryContactEmail: z
            .string()
            .email('Please enter a valid email address')
            .max(255, 'Email is too long'),
          primaryContactPhoneNumber: z
            .string()
            .max(50, 'Phone number is too long')
            .refine(
              (phone) => {
                if (!phone || phone.trim() === '') return true; // Optional field
                return validateInternationalPhone(phone);
              },
              {
                message:
                  'Please enter a valid international phone number (e.g., +56 9 8765 4321 or +1 555 123 4567)',
              },
            )
            .optional(),
          primaryContactWebsite: z
            .string()
            .max(500, 'Website URL is too long')
            .refine((url) => !url || url.startsWith('https://'), {
              message: 'URL is missing https://',
            })
            .refine(
              (url) => {
                if (!url) return true; // Allow empty values since it's optional
                try {
                  new URL(url);
                  return true;
                } catch {
                  return false;
                }
              },
              {
                message: 'Please enter a valid URL',
              },
            )
            .optional()
            .or(z.literal('')),
          primaryContactLinkedin: z
            .string()
            .url('Please enter a valid LinkedIn URL')
            .max(500, 'LinkedIn URL is too long')
            .optional()
            .or(z.literal('')),
        }),
      )
      .default([]),

    // Themes (required array of theme IDs)
    themeIds: z
      .array(z.string().uuid('Invalid theme ID'))
      .min(1, 'Please select at least one theme'),

    // Audiences (required array of audience IDs)
    audienceIds: z
      .array(z.string().uuid('Invalid audience ID'))
      .min(1, 'Please select at least one target audience'),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type CreateEventFormData = z.infer<typeof createEventFormSchema>;

// Event format display names
export const eventFormatLabels: Record<(typeof eventFormats)[number], string> =
  {
    breakfast_brunch_lunch: 'Breakfast / Brunch / Lunch',
    dinner: 'Dinner',
    experiential: 'Experiential',
    hackathon: 'Hackathon',
    happy_hour: 'Happy Hour',
    matchmaking: 'Matchmaking',
    networking: 'Networking',
    panel_fireside_chat: 'Panel / Fireside Chat',
    pitch_event_demo_day: 'Pitch Event / Demo Day',
    roundtable_workshop: 'Roundtable / Workshop',
  };

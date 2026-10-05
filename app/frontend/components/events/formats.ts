import type { Locale } from '@/lib/i18n';
import type { EventFormat } from '@/types';
import labels from '../../../../config/event_formats.json';

// The formats' names on the 2026 pages (filters, cards, the form's select), per language. The
// JSON is shared with Ruby (Event::FORMAT_LABELS), which prints the same names for agents.
export const FORMAT_LABELS: Record<Locale, Record<EventFormat, string>> = labels;

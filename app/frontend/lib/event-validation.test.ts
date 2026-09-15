import { describe, expect, it } from 'vitest';
import { validateEvent } from './event-validation';

const options = { weekDates: { from: '2026-11-16', to: '2026-11-22' }, descriptionLimit: 300, communes: ['Providencia'], formats: ['networking'] };
function validData() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ company_name: 'Platanus', company_website: 'https://platan.us', author_name: 'Ada', author_email: 'ada+event@platan.us', author_phone_number: '+56 9 8765 4321', title: 'Demo', description: 'Description', starts_at: '2026-11-16T00:00', ends_at: '2026-11-22T23:59', commune: 'Providencia', format: 'networking', capacity: '500000' })) data.set(`event[${key}]`, value);
  data.set('event[logo_upload]', new File(['image'], 'logo.png', { type: 'image/png' }));
  data.set('event[theme_ids][]', 'ai');
  data.set('event[audience_ids][]', 'founders');
  return data;
}
describe('event submission validation', () => {
  it('accepts the week and capacity boundaries', () => {
    expect(validateEvent(validData(), options)).toEqual({});
  });
  it('checks length, capacity, HTTPS, date boundaries, and required groups', () => {
    const data = validData();
    data.set('event[title]', 'a'.repeat(501));
    data.set('event[description]', 'a'.repeat(301));
    data.set('event[company_website]', 'http://platan.us');
    data.set('event[capacity]', '1.5');
    data.set('event[starts_at]', '2026-11-15T23:59');
    data.set('event[ends_at]', '2026-11-23T00:00');
    data.delete('event[theme_ids][]');
    data.delete('event[audience_ids][]');
    expect(Object.keys(validateEvent(data, options))).toEqual(expect.arrayContaining(['title', 'description', 'company_website', 'capacity', 'starts_at', 'ends_at', 'themes', 'audiences']));
  });
  it('requires the end to follow the start', () => {
    const data = validData();
    data.set('event[ends_at]', '2026-11-16T00:00');
    expect(validateEvent(data, options).ends_at).toContain('después');
  });
  it('checks each co-host and permits empty optional contacts', () => {
    const data = validData();
    const prefix = 'event[cohosts_attributes][0]';
    data.set(`${prefix}[company_name]`, 'Partner');
    data.set(`${prefix}[primary_contact_name]`, 'Grace');
    data.set(`${prefix}[primary_contact_email]`, 'invalid');
    data.set(`${prefix}[primary_contact_phone_number]`, '');
    data.set(`${prefix}[primary_contact_website]`, '');
    data.set(`${prefix}[primary_contact_linkedin]`, 'http://linkedin.com/in/grace');
    expect(Object.keys(validateEvent(data, options))).toEqual(['cohosts[0].primary_contact_email', 'cohosts[0].primary_contact_linkedin', 'cohosts[0].logo']);
    data.set(`${prefix}[primary_contact_email]`, 'grace@partner.cl');
    data.set(`${prefix}[primary_contact_linkedin]`, '');
    data.set(`${prefix}[logo_upload]`, new File(['image'], 'logo.png', { type: 'image/png' }));
    expect(validateEvent(data, options)).toEqual({});
  });
});

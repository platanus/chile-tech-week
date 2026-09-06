import { execSync } from 'node:child_process';
import { expect, type Page, test } from '@playwright/test';
import { adminPath, WEEK } from './week';

// The moderation panel against the dev stack's seed (db/seeds.rb: admin@techweek.cl).
const SHOT = { path: '', fullPage: true };
const shot = (page: Page, name: string) => page.screenshot({ ...SHOT, path: `tmp/screenshots/admin-${name}.png` });

test.use({ viewport: { width: 1280, height: 900 } });

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill('admin@techweek.cl');
  await page.getByLabel('Contraseña').fill('techweek2026');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin\/\d\d\/events/);
}

test('the login page rejects a wrong password', async ({ page }) => {
  await page.goto('/admin/login');
  await shot(page, 'login');
  await page.getByLabel('Email').fill('admin@techweek.cl');
  await page.getByLabel('Contraseña').fill('wrong');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Email o contraseña incorrectos')).toBeVisible();
});

test('an admin moderates a submission', async ({ page }) => {
  // Its own event, so the run neither depends on what the seed still holds nor collides with
  // what an earlier run rejected.
  const title = `Revisión e2e ${Date.now()}`;
  execSync(
    `bin/rails runner 'Week.current.events.create!(title: ${JSON.stringify(title)}, description: "Un evento de prueba.", ` +
      `company_name: "Platanus", company_website: "https://platan.us", company_logo_url: "/25/opengraph.png", ` +
      `author_name: "Ada Lovelace", author_email: "ada@platan.us", author_phone_number: "+56 9 8765 4321", ` +
      `starts_at: Time.zone.local(2026, 11, 17, 18), ends_at: Time.zone.local(2026, 11, 17, 20), ` +
      `commune: "Providencia", format: "networking", capacity: 40, state: "submitted")'`,
    { encoding: 'utf8' },
  );

  await login(page);
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible();
  await shot(page, 'events');

  await page.getByLabel('Buscar eventos').fill(title);
  await page.keyboard.press('Enter');
  const row = page.locator(`a[href^="${adminPath('/events/')}"]`).filter({ hasText: title });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('Organizador')).toBeVisible();
  await shot(page, 'event-submitted');

  await page.getByRole('button', { name: 'Rechazar' }).click();
  await page.getByLabel('Motivo del rechazo').fill('Prueba e2e: el evento no calza con la semana.');
  await page.getByRole('button', { name: 'Rechazar evento' }).click();
  await expect(page.getByText('Evento rechazado y correo enviado.')).toBeVisible();
  await expect(page.getByText('Prueba e2e: el evento no calza con la semana.')).toBeVisible();
  await shot(page, 'event-rejected');

  await page.goto(adminPath(`/events?status=rejected&search=${encodeURIComponent(title)}`));
  await expect(page.locator(`a[href^="${adminPath('/events/')}"]`).filter({ hasText: title })).toHaveCount(1);
});

test('an event waiting for its Luma edit shows its Luma details', async ({ page }) => {
  // Its own event: the flow spec publishes the seed's waiting one while this runs.
  const title = `Esperando e2e ${Date.now()}`;
  const id = execSync(
    `bin/rails runner 'print Week.current.events.create!(title: ${JSON.stringify(title)}, description: "Un evento de prueba.", ` +
      `company_name: "Platanus", company_website: "https://platan.us", company_logo_url: "/25/opengraph.png", ` +
      `author_name: "Ada Lovelace", author_email: "ada@platan.us", author_phone_number: "+56 9 8765 4321", ` +
      `starts_at: Time.zone.local(2026, 11, 17, 18), ends_at: Time.zone.local(2026, 11, 17, 20), ` +
      `commune: "Providencia", format: "networking", capacity: 40, state: "waiting_luma_edit", ` +
      `approved_at: Time.current, waiting_luma_edit_at: Time.current, luma_event_api_id: "evt-fake-e2e", ` +
      `luma_event_url: "https://luma.com/fake-e2e").id'`,
    { encoding: 'utf8' },
  ).trim();

  await login(page);
  await page.goto(adminPath(`/events/${id}`));
  await expect(page.getByText('Esperando edición en Luma').first()).toBeVisible();
  await expect(page.getByText('Evento en Luma')).toBeVisible();
  await expect(page.getByText('Editar comuna')).toBeVisible();
  await shot(page, 'event-waiting');
});

test('search and the published list', async ({ page }) => {
  await login(page);
  await page.goto(adminPath('/events?status=published'));
  await page.getByLabel('Buscar eventos').fill('brunch');
  await page.getByLabel('Buscar eventos').press('Enter');
  await expect(page).toHaveURL(/search=brunch/);
  await expect(page.locator(`a[href^="${adminPath('/events/')}"]`).first()).toContainText(/brunch/i);
  await shot(page, 'events-search');
});

test('the emails and tasks pages', async ({ page }) => {
  await login(page);
  await page.goto(adminPath('/emails'));
  await expect(page.getByRole('heading', { name: 'Correos' })).toBeVisible();
  await expect(page.getByText('Tasa de éxito')).toBeVisible();
  await shot(page, 'emails');

  await page.goto(adminPath('/tasks'));
  await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible();
  await expect(page.getByText('sync-luma-events')).toBeVisible();
  await expect(page.getByText('luma-reminder')).toBeVisible();
  await shot(page, 'tasks');
});

test('the week switcher moves to another edition, staying in the same area', async ({ page }) => {
  await login(page);
  await page.goto(adminPath('/emails'));

  await page.getByLabel('Cambiar de Tech Week').click();
  await page.getByRole('option', { name: 'Tech Week 2025' }).click();

  await expect(page).toHaveURL(/\/admin\/25\/emails/);
  await expect(page.getByRole('heading', { name: 'Correos' })).toBeVisible();
  await shot(page, 'week-switcher');

  // and back to the week the panel opens on
  await page.getByLabel('Cambiar de Tech Week').click();
  await page.getByRole('option', { name: `Tech Week 20${WEEK}` }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/${WEEK}/emails`));
});

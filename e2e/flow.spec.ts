import { expect, type Page, test } from '@playwright/test';

// The whole review flow, end to end, against the dev stack: a host submits, an admin approves
// (Luma::FakeClient stands in for Luma), the host publishes from the status page, and the
// event appears in the programme.
async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill('admin@techweek.cl');
  await page.getByLabel('Contraseña').fill('techweek2026');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin\/events/);
}

test('submit → approve → publish → in the programme', async ({ page }) => {
  const title = `Flujo e2e ${Date.now()}`;

  await page.goto('/events/new');
  await page.getByLabel('Nombre de la empresa').first().fill('Platanus');
  await page.getByLabel('Sitio web').first().fill('https://platan.us');
  await page.getByLabel('Nombre de contacto').first().fill('Ada Lovelace');
  await page.getByLabel('Email de contacto').first().fill('ada@platan.us');
  await page.getByLabel('Teléfono de contacto').fill('+56 9 8765 4321');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByLabel('Título').fill(title);
  await page.getByLabel('Descripción').fill('Un evento de prueba del flujo completo.');
  await page.getByLabel('Inicio').fill('2026-11-19T18:00');
  await page.getByRole('combobox', { name: 'Comuna' }).click();
  await page.getByRole('option', { name: 'Providencia' }).click();
  await page.getByRole('combobox', { name: 'Formato' }).click();
  await page.getByRole('option', { name: 'Networking' }).click();
  await page.getByLabel('Capacidad').fill('40');
  await page.getByLabel('Logo de la empresa').setInputFiles('spec/fixtures/files/logo.png');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByText('Fintech', { exact: true }).click();
  await page.getByText('Investors', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByRole('button', { name: 'Enviar evento' }).click();
  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
  const statusUrl = page.url();
  await expect(page.getByText('Estado · paso 1 de 4')).toBeVisible();

  // the admin approves: the fake Luma event is created and the event waits for its edit
  await login(page);
  await page.getByLabel('Buscar eventos').fill(title);
  await page.keyboard.press('Enter');
  await page.getByRole('link', { name: title }).click();
  await page.getByRole('button', { name: 'Aprobar' }).click();
  await expect(page.getByRole('status')).toContainText('Evento aprobado');
  await expect(page.getByText(/luma\.com\/fake-/)).toBeVisible();

  // the outbound log has the approval mail
  await page.goto('/admin/emails');
  await expect(page.getByText('event_approved').first()).toBeVisible();

  // the host publishes from the status page
  await page.goto(`${statusUrl}?publish=true`);
  await expect(page.getByText('Estado · paso 3 de 4')).toBeVisible();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Siguiente' }).click();
  await dialog.getByRole('button', { name: 'Publicar evento' }).click();
  await expect(page.getByText('Estado · paso 4 de 4')).toBeVisible();

  // and the programme lists it
  await page.goto('/events');
  await page.getByRole('searchbox', { name: 'Buscar' }).fill('Flujo e2e');
  await expect(page.getByTestId('event-card').filter({ hasText: title })).toHaveCount(1);
});

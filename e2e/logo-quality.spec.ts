import { fillOrganizer, fillEventDetails } from './event-form';
import { expect, test } from '@playwright/test';

test('rejects small and corrupt logos, accepts a replacement, and checks co-hosts too', async ({ page }) => {
  await page.goto('/events/new');
  await fillOrganizer(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await fillEventDetails(page);
  const logo = page.getByLabel('Logo de la empresa');
  await logo.setInputFiles('spec/fixtures/files/logo.png');
  await expect(page.getByText(/El logo es muy pequeño/)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Paso 2 de 4')).toBeVisible();

  await logo.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  await expect(page.getByText(/No pudimos leer la imagen/)).toBeVisible();
  await logo.setInputFiles('spec/fixtures/files/logo-quality.png');
  await expect(page.getByText(/400 × 400 px/)).toBeVisible();
  await expect(page.getByText(/El logo es muy pequeño/)).toHaveCount(0);
  await expect(page.getByText(/También aceptamos logos con fondo/)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Paso 3 de 4')).toBeVisible();
  await page.getByText('Fintech', { exact: true }).click();
  await page.getByText('Investors', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Agregar co-host' }).click();
  const cohost = page.locator('section[data-step="3"]');
  await cohost.getByLabel('Logo de la empresa').setInputFiles('spec/fixtures/files/logo.png');
  await expect(cohost.getByText(/El logo es muy pequeño/)).toBeVisible();
  let submitted = false;
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/events')) submitted = true; });
  await page.getByRole('button', { name: 'Enviar evento' }).click();
  await expect(cohost.getByText(/El logo es muy pequeño/)).toBeVisible();
  expect(submitted).toBe(false);

  await cohost.getByLabel('Logo de la empresa').setInputFiles('spec/fixtures/files/logo-quality.png');
  await expect(cohost.getByText(/400 × 400 px/)).toBeVisible();
  await page.getByRole('button', { name: 'Evento', exact: true }).click();
  await page.locator('section[data-step="1"]').getByLabel('Logo de la empresa').setInputFiles('spec/fixtures/files/logo.png');
  await expect(page.getByText(/El logo es muy pequeño/)).toBeVisible();
  await page.getByRole('button', { name: 'Co-hosts' }).click();
  await page.getByRole('button', { name: 'Enviar evento' }).click();
  await expect(page.getByText('Paso 2 de 4')).toBeVisible();
  expect(submitted).toBe(false);
});

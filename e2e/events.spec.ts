import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

// The public 2026 pages against the seeded dev database (bin/rails db:seed): the programme,
// the submission form and the status page it lands on.
test.describe('the programme', () => {
  test('lists the events and narrows by day and by search', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveTitle('Eventos · Chile Tech Week 2026');
    await expect(page.getByRole('heading', { level: 1, name: 'Eventos' })).toBeVisible();

    const cards = page.getByTestId('event-card');
    const all = await cards.count();
    expect(all).toBeGreaterThan(3);

    await page.getByRole('button', { name: /^Lun 16/ }).click();
    const monday = await cards.count();
    expect(monday).toBeGreaterThan(0);
    expect(monday).toBeLessThan(all);
    await expect(cards.first()).toContainText(/Founders Summit|Open Office|Meet & Connect/i);

    await page.getByRole('button', { name: /^Todos/ }).click();
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('hackathon');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Hackathon');

    await page.getByRole('searchbox', { name: 'Buscar' }).fill('zzzz-nothing');
    await expect(page.getByText('Ningún evento coincide con los filtros')).toBeVisible();
  });

  test('shows the artwork Luma holds for each event', async ({ page }) => {
    await page.goto('/events');
    const covers = page.getByTestId('event-card').locator('img');
    expect(await covers.count()).toBeGreaterThan(0);
    await expect(covers.first()).toBeVisible();
  });

  test('has no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/events');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
});

test.describe('the status page', () => {
  let waitingId: string;
  test.beforeAll(() => {
    waitingId = execSync(
      `bin/rails runner 'puts Event.for_edition(Edition::YEAR).find_by!(state: "waiting_luma_edit").id'`,
      { encoding: 'utf8' },
    ).trim();
  });

  test('opens the publish dialog from the email link at step 3', async ({ page }) => {
    await page.goto(`/events/${waitingId}?publish=true`);
    await expect(page.getByText('Estado · paso 3 de 4')).toBeVisible();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Antes de publicar')).toBeVisible();
    await expect(dialog.getByText('Editar tu perfil de Luma con el nombre y el logo de la empresa')).toBeVisible();
    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await expect(dialog.getByText('Listo para publicar')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Publicar evento' })).toBeVisible();
    await page.screenshot({ path: 'tmp/screenshots/show-dialog.png' });
    await dialog.getByRole('button', { name: 'Atrás' }).click();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ya edité Luma · Publicar evento' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Editar en Luma/ })).toHaveAttribute('href', /luma\.com/);
  });
});

test.describe('the submission form', () => {
  test('sends the form back with Spanish errors when it is empty', async ({ page }) => {
    await page.goto('/events/new');
    // Four steps, nothing filled in: the last one is where the submit lives.
    for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Enviar evento' }).click();
    // It comes back on the first step the server complained about — the organizer's.
    await expect(page.getByText('Paso 1 de 4')).toBeVisible();
    await expect(page.getByText('El nombre de la empresa no puede estar en blanco')).toBeVisible();
    await page.getByRole('button', { name: 'Evento' }).click();
    await expect(page.getByText('El título no puede estar en blanco')).toBeVisible();
    await expect(page.getByText('El logo no puede estar en blanco')).toBeVisible();
    await page.getByRole('button', { name: 'Temas y audiencias' }).click();
    await expect(page.getByText('Los temas no puede estar en blanco')).toBeVisible();
    await expect(page).toHaveURL(/\/events\/new$/);
  });

  test('submits a whole event with a co-host and lands on its status page', async ({ page }) => {
    await page.goto('/events/new');
    await expect(page.getByRole('heading', { level: 1, name: 'Organiza un evento' })).toBeVisible();

    await page.getByLabel('Nombre de la empresa').first().fill('Platanus');
    await page.getByLabel('Sitio web').first().fill('https://platan.us');
    await page.getByLabel('Nombre de contacto').first().fill('Ada Lovelace');
    await page.getByLabel('Email de contacto').first().fill('ada@platan.us');
    await page.getByLabel('Teléfono de contacto').fill('+56 9 8765 4321');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.getByLabel('Título').fill('Demo Day e2e');
    await page.getByLabel('Descripción').fill('Doce startups presentan frente a inversionistas.');
    await expect(page.getByText('/300 caracteres')).toContainText('48/300');

    await page.getByLabel('Inicio').fill('2026-11-18T18:00');
    await expect(page.getByLabel('Término')).toHaveValue('2026-11-18T20:00');
    await page.getByLabel('Término').fill('2026-11-19T02:00');
    await expect(page.getByText(/Este evento dura 8 horas/)).toBeVisible();
    await page.getByLabel('Término').fill('2026-11-18T21:00');

    await page.getByRole('combobox', { name: 'Comuna' }).click();
    await page.getByRole('option', { name: 'Providencia' }).click();
    await page.getByRole('combobox', { name: 'Formato' }).click();
    await page.getByRole('option', { name: 'Pitch / Demo day' }).click();
    await page.getByLabel('Capacidad').fill('80');
    await page.getByLabel('Logo de la empresa').setInputFiles('spec/fixtures/files/logo.png');
    await expect(page.getByText(/logo\.png · \d+ KB/)).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.getByText('Fintech', { exact: true }).click();
    await page.getByText('Investors', { exact: true }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // What was typed two steps back is still there when you walk back to it.
    await page.getByRole('button', { name: 'Organizador' }).click();
    await expect(page.getByLabel('Nombre de la empresa').first()).toHaveValue('Platanus');
    await page.getByRole('button', { name: 'Co-hosts' }).click();

    await page.getByRole('button', { name: 'Agregar co-host' }).click();
    const cohost = page.locator('section', { hasText: 'Co-host 1' });
    await cohost.getByLabel('Nombre de la empresa').fill('BCI');
    await cohost.getByLabel('Nombre de contacto').fill('Grace Hopper');
    await cohost.getByLabel('Email de contacto').fill('grace@bci.cl');
    await cohost.getByLabel('Logo de la empresa').setInputFiles('spec/fixtures/files/logo.png');

    await page.getByRole('button', { name: 'Enviar evento' }).click();

    await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('status')).toContainText('¡Evento enviado! Lo revisaremos pronto.');
    await expect(page.getByRole('heading', { level: 1, name: 'Demo Day e2e' })).toBeVisible();
    await expect(page.getByText('Estado · paso 1 de 4')).toBeVisible();
    await expect(page.getByText('Platanus + BCI')).toBeVisible();
    await expect(page.getByText('miércoles, 18 de noviembre de 2026')).toBeVisible();
    await expect(page.getByText('18:00 – 21:00')).toBeVisible();
    await expect(page.getByText('Pitch / Demo day')).toBeVisible();
    await expect(page.getByText('Fintech', { exact: true })).toBeVisible();
    await expect(page.locator('img[alt="Platanus"]')).toBeVisible();
  });
});

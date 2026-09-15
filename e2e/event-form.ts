import type { Page } from '@playwright/test';

export async function fillOrganizer(page: Page) {
  await page.getByLabel('Nombre de la empresa').first().fill('Platanus');
  await page.getByLabel('Sitio web').first().fill('https://platan.us');
  await page.getByLabel('Nombre de contacto').first().fill('Ada Lovelace');
  await page.getByLabel('Email de contacto').first().fill('ada@platan.us');
  await page.getByLabel('Teléfono de contacto').fill('+56 9 8765 4321');
}

export async function fillEventDetails(page: Page) {
  await page.getByLabel('Título').fill('Demo Day');
  await page.getByLabel('Descripción').fill('Startups presentan frente a inversionistas.');
  await page.getByLabel('Inicio').fill('2026-11-18T18:00');
  await page.getByRole('combobox', { name: 'Comuna' }).click();
  await page.getByRole('option', { name: 'Providencia' }).click();
  await page.getByRole('combobox', { name: 'Formato' }).click();
  await page.getByRole('option', { name: 'Pitch / Demo day' }).click();
  await page.getByLabel('Capacidad').fill('80');
}

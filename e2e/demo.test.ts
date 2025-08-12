import { expect, test } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

test('SVG can be converted to WebP and downloaded', async ({ page, context, browserName }) => {
  await page.goto('/');

  // Ensure the page is ready
  await expect(page.getByText('File Converter')).toBeVisible();

  // Upload the SVG file from sample-files
  const svgPath = path.resolve(process.cwd(), 'sample-files', 'telus-logo.svg');
  const fileInput = page.locator('#file-input');
  await fileInput.setInputFiles(svgPath);

  // Select WebP format if options are shown (images)
  const webpOption = page.getByText('WebP');
  await expect(webpOption).toBeVisible();

  // Intercept the download
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Start conversion' }).click()
  ]);

  const suggested = download.suggestedFilename();
  expect(suggested.endsWith('.webp')).toBeTruthy();

  // Ensure it actually saves and has bytes
  const resultsDir = path.resolve(process.cwd(), 'test-results');
  await fs.mkdir(resultsDir, { recursive: true });
  const savePath = path.resolve(resultsDir, suggested);
  await download.saveAs(savePath);

  const fileStat = await fs.stat(savePath);
  expect(fileStat.size).toBeGreaterThan(0);
});

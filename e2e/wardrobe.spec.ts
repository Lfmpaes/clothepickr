import { expect, test } from '@playwright/test'

test('laundry cycle can be processed end-to-end', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /^Items$/ }).first().click()
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Item name').fill('Cycle Test Tee')
  await page.getByRole('button', { name: 'Create item' }).click()

  await expect(page.getByText('Cycle Test Tee')).toBeVisible()

  await page.getByRole('link', { name: 'Laundry' }).click()
  await page.getByRole('button', { name: 'Move all to Dirty' }).first().click()
  await page.getByRole('button', { name: 'Move all to Washing' }).first().click()
  await page.getByRole('button', { name: 'Move all to Drying' }).first().click()
  await page.getByRole('button', { name: 'Move all to Clean' }).first().click()

  await expect(page.getByText('Recent transitions')).toBeVisible()
})

test('mobile item creation supports optional photos', async ({ page }) => {
  await page.goto('/items/new')
  await page.getByLabel('Item name').fill('Photo Test Hoodie')

  await page.setInputFiles('input[type="file"]', {
    name: 'hoodie.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+XQAAAABJRU5ErkJggg==',
      'base64',
    ),
  })

  await page.getByRole('button', { name: 'Create item' }).click()
  await expect(page.getByRole('heading', { name: 'Photo Test Hoodie' })).toBeVisible()
})

test.skip('offline reopen keeps local data', async () => {
  // Requires dedicated service worker + offline harness in CI browser image.
})

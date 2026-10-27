import { test, expect } from '@playwright/test';

async function capturePage(page, path) {
  // Full-page capture alone does not trigger lazy images outside the viewport.
  for (const img of await page.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.locator('main').focus();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
}

test('responsive storefront and original product photos', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.product-card')).toHaveCount(4);
    await expect(page.locator('.product-photo')).toHaveCount(4);
    await page.locator('.product-card').last().scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.product-photo').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
    await capturePage(page, testInfo.outputPath(`home-${width}.png`));
    const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')]
      .filter(el => el.getBoundingClientRect().right > innerWidth + 1)
      .map(el => `${el.tagName}.${el.className}`).slice(0, 12));
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px overflow: ${overflow.join(', ')}`).toBeLessThanOrEqual(width);
  }
  expect(errors).toEqual([]);
});

test('header search, filters, sorting, empty state and URL history', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'サイト内の商品検索' }).fill('丸干し');
  await page.locator('.header-search').getByRole('button').click();
  await expect(page.locator('.product-card')).toHaveCount(3);
  await page.getByRole('combobox', { name: '並び順' }).selectOption('price_asc');
  await expect(page.locator('.product-card').first()).toContainText('250g');
  await page.reload();
  await expect(page.getByRole('textbox', { name: '商品を検索', exact: true })).toHaveValue('丸干し');
  await expect(page.getByRole('combobox', { name: '並び順' })).toHaveValue('price_asc');
  await page.getByRole('button', { name: '訳あり品', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.goBack();
  await expect(page.locator('.product-card')).toHaveCount(3);
  await page.getByRole('textbox', { name: '商品を検索', exact: true }).fill('見つからない商品xyz');
  await page.locator('.catalog-search').getByRole('button', { name: '検索', exact: true }).click();
  await expect(page.getByText('該当する商品がありません')).toBeVisible();
  await page.getByRole('button', { name: '条件をクリアする' }).click();
  await expect(page.locator('.product-card')).toHaveCount(12);
  await expect(page.locator('.product-photo')).toHaveCount(12);
  await capturePage(page, testInfo.outputPath('shop-mobile.png'));
});

test('signup, persisted cart, checkout and session restoration', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#shop');
  await expect(page.getByRole('button', { name: 'ログイン', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await page.getByRole('button', { name: '初めての方はこちら — 新規登録' }).click();
  await page.getByLabel('お名前（ニックネーム）').fill('CI shopper');
  await page.getByLabel('メールアドレス').fill(`ci-${Date.now()}@example.com`);
  await page.getByLabel('パスワード', { exact: true }).fill('Test-only-password32!');
  await page.getByRole('button', { name: 'アカウントを作成' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('.product-card').first().getByRole('button', { name: /カートに入れる/ }).click();
  await expect(page.getByRole('button', { name: 'カート 1点' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'カート 1点' })).toBeVisible();
  await page.getByRole('button', { name: 'カート 1点' }).click();
  await page.getByRole('button', { name: 'デモ注文を確定する' }).click();
  await expect(page.getByRole('heading', { name: 'デモ注文を受け付けました' })).toBeVisible();
  await page.getByRole('button', { name: '注文履歴を見る' }).click();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('order-mobile.png'), fullPage: true });
});

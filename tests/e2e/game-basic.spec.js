import { test, expect } from '@playwright/test';

test.describe('Game Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load game page correctly', async ({ page }) => {
    await expect(page).toHaveTitle('NS-SHAFT 游戏');
    
    // Check if main elements are visible
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await expect(page.locator('#startButton')).toBeVisible();
    await expect(page.locator('.score')).toHaveText('深度: 0m');
    await expect(page.locator('.lives')).toHaveText('生命值: 100/100');
  });

  test('should start game when clicking start button', async ({ page }) => {
    // Click start button
    await page.locator('#startButton').click();
    
    // Wait a moment for game to start
    await page.waitForTimeout(100);
    
    // Check if game state has changed (button should be hidden or changed)
    await expect(page.locator('#startButton')).toBeHidden();
    await expect(page.locator('#restartButton')).toBeVisible();
  });

  test('should show game instructions', async ({ page }) => {
    await expect(page.getByText('使用 ← → 键移动')).toBeVisible();
    await expect(page.getByText('按空格键向上跳')).toBeVisible();
    await expect(page.getByText('绿色-普通, 紫色-移动, 黄色-破碎, 红色-有刺, 蓝色-弹簧')).toBeVisible();
  });

  test('should have mobile controls in mobile viewport', async ({ page }) => {
    // Set mobile viewport to make controls visible
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('#leftButton')).toBeVisible();
    await expect(page.locator('#rightButton')).toBeVisible();
  });
});
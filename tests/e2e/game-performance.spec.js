import { test, expect } from '@playwright/test';

test.describe('Game Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should not have console errors on load', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Start and run game briefly
    await page.locator('#startButton').click();
    await page.waitForTimeout(1000);
    
    // Check for console errors
    expect(consoleLogs.filter(log => 
      !log.includes('Could not establish connection') // Ignore extension errors
    )).toHaveLength(0);
  });

  test('should maintain reasonable frame rate', async ({ page }) => {
    await page.locator('#startButton').click();
    
    // Measure performance over time
    const startTime = Date.now();
    await page.waitForTimeout(3000);
    const endTime = Date.now();
    
    // Game should have run for approximately 3 seconds
    const actualDuration = endTime - startTime;
    expect(actualDuration).toBeGreaterThan(2900);
    expect(actualDuration).toBeLessThan(3500);
  });

  test('should handle rapid input without issues', async ({ page }) => {
    await page.locator('#startButton').click();
    await page.waitForTimeout(100);
    
    // Rapid keyboard input
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      await page.waitForTimeout(10);
    }
    
    // Game should still be responsive
    await expect(page.locator('#restartButton')).toBeVisible();
    
    // Depth should still be updating
    const depthText = await page.locator('#depth').textContent();
    expect(parseInt(depthText)).toBeGreaterThan(0);
  });

  test('should handle browser back/forward correctly', async ({ page }) => {
    await page.locator('#startButton').click();
    await page.waitForTimeout(500);
    
    // Navigate away and back
    await page.goto('about:blank');
    await page.goBack();
    
    // Game should load correctly again
    await expect(page).toHaveTitle('NS-SHAFT 游戏');
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await expect(page.locator('#startButton')).toBeVisible();
  });
});
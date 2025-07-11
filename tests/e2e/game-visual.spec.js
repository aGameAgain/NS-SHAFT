import { test, expect } from '@playwright/test';

test.describe('Game Visual Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render game canvas correctly', async ({ page }) => {
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();
    
    // Check canvas has reasonable dimensions
    const canvasSize = await canvas.boundingBox();
    expect(canvasSize.width).toBeGreaterThan(300);
    expect(canvasSize.height).toBeGreaterThan(200);
  });

  test('should show initial game state visually', async ({ page }) => {
    // Take screenshot of initial state
    await page.locator('#gameCanvas').screenshot({ 
      path: 'tests/screenshots/initial-state.png' 
    });
    
    // Start game and take another screenshot
    await page.locator('#startButton').click();
    await page.waitForTimeout(100);
    
    await page.locator('#gameCanvas').screenshot({ 
      path: 'tests/screenshots/game-started.png' 
    });
  });

  test('should maintain visual consistency on resize', async ({ page }) => {
    // Start game
    await page.locator('#startButton').click();
    await page.waitForTimeout(100);
    
    // Take screenshot at normal size
    await page.locator('#gameCanvas').screenshot({ 
      path: 'tests/screenshots/normal-size.png' 
    });
    
    // Resize viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(100);
    
    // Take screenshot after resize
    await page.locator('#gameCanvas').screenshot({ 
      path: 'tests/screenshots/resized.png' 
    });
    
    // Game should still be running
    await expect(page.locator('#restartButton')).toBeVisible();
  });

  test('should handle mobile viewport correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile-specific elements
    await expect(page.locator('#leftButton')).toBeVisible();
    await expect(page.locator('#rightButton')).toBeVisible();
    
    // Start game on mobile
    await page.locator('#startButton').click();
    await page.waitForTimeout(100);
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/mobile-game.png',
      fullPage: true 
    });
  });
});
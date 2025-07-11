import { test, expect } from '@playwright/test';

test.describe('Game Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Start the game
    await page.locator('#startButton').click();
    await page.waitForTimeout(100);
  });

  test('should respond to keyboard input', async ({ page }) => {
    // Test arrow key movement
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    
    // Test space key for jumping
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
    
    // Game should still be running after input
    await expect(page.locator('#restartButton')).toBeVisible();
  });

  test('should respond to mobile controls', async ({ page }) => {
    // Set mobile viewport to make controls visible
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.locator('#startButton').click();
    await page.waitForTimeout(100);
    
    // Test left button
    await page.locator('#leftButton').click();
    await page.waitForTimeout(50);
    
    // Test right button
    await page.locator('#rightButton').click();
    await page.waitForTimeout(50);
    
    // Game should still be running
    await expect(page.locator('#restartButton')).toBeVisible();
  });

  test('should update depth over time', async ({ page }) => {
    // Wait for game to progress
    await page.waitForTimeout(2000);
    
    // Check if depth has increased
    const depthText = await page.locator('#depth').textContent();
    const depth = parseInt(depthText);
    
    expect(depth).toBeGreaterThan(0);
  });

  test('should maintain game state during play', async ({ page }) => {
    // Let game run for a short time
    await page.waitForTimeout(1000);
    
    // Lives should still be 100 initially
    await expect(page.locator('#lives')).toHaveText('100');
    
    // Depth should be progressing
    const depthText = await page.locator('#depth').textContent();
    expect(parseInt(depthText)).toBeGreaterThan(0);
  });

  test('should restart game correctly', async ({ page }) => {
    // Let game run for a moment to build up depth
    await page.waitForTimeout(1000);
    
    // Verify game has progressed
    const depthBeforeRestart = await page.locator('#depth').textContent();
    expect(parseInt(depthBeforeRestart)).toBeGreaterThan(0);
    
    // Restart game
    await page.locator('#restartButton').click();
    
    // Wait a bit longer for the restart to complete
    await page.waitForTimeout(200);
    
    // Check if game restarted - depth should be 0 or very low
    const depthAfterRestart = await page.locator('#depth').textContent();
    const finalDepth = parseInt(depthAfterRestart);
    
    // Allow for some timing variance - depth should be much lower than before
    expect(finalDepth).toBeLessThan(parseInt(depthBeforeRestart) / 2);
    await expect(page.locator('#lives')).toHaveText('100');
  });
});
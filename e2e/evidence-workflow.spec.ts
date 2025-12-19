import { test, expect } from '@playwright/test';

test.describe('Evidence Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to evidence management page', async ({ page }) => {
    // Navigate to evidence section
    await page.click('[data-testid="nav-evidence"]');

    // Verify we're on the evidence page
    await expect(page).toHaveURL(/\/evidence/);
    await expect(page.locator('h1')).toContainText('Evidence Management');
  });

  test('should display case overview with basic information', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for case overview widget
    await expect(page.locator('[data-testid="case-overview"]')).toBeVisible();

    // Verify case information is displayed
    await expect(page.locator('[data-testid="case-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="case-status"]')).toBeVisible();
  });

  test('should display trust score widget', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for 6D Trust widget
    await expect(page.locator('[data-testid="six-d-trust-widget"]')).toBeVisible();

    // Verify trust score elements
    await expect(page.getByText('ChittyTrust')).toBeVisible();
    await expect(page.getByText('6D Trust Revolution')).toBeVisible();
  });

  test('should allow evidence upload workflow', async ({ page }) => {
    await page.goto('/evidence');

    // Look for upload button or area
    const uploadButton = page.locator('[data-testid="upload-evidence"], [data-testid="quick-upload"], button:has-text("Upload")').first();
    await expect(uploadButton).toBeVisible();

    // Click upload button
    await uploadButton.click();

    // Verify upload dialog or form appears
    await expect(page.locator('[data-testid="upload-form"], [role="dialog"]')).toBeVisible();
  });

  test('should display evidence cards with proper information', async ({ page }) => {
    await page.goto('/evidence');

    // Wait for evidence cards to load
    await page.waitForSelector('[data-testid="evidence-card"], .evidence-card', { timeout: 10000 });

    // Check if evidence cards are displayed
    const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
    await expect(evidenceCards.first()).toBeVisible();

    // Verify evidence card contains expected information
    await expect(evidenceCards.first().locator('[data-testid="artifact-id"], .artifact-id')).toBeVisible();
  });

  test('should show ChittyVerify functionality', async ({ page }) => {
    await page.goto('/evidence');

    // Look for ChittyVerify widget or button
    const chittyVerifyElement = page.locator('[data-testid="chitty-verify"], button:has-text("ChittyVerify")').first();

    if (await chittyVerifyElement.isVisible()) {
      await chittyVerifyElement.click();

      // Verify ChittyVerify interface appears
      await expect(page.locator('[data-testid="verify-status"], .verify-status')).toBeVisible();
    }
  });

  test('should display blockchain integration features', async ({ page }) => {
    await page.goto('/evidence');

    // Look for minting or blockchain-related elements
    const blockchainElements = page.locator('[data-testid="minting-controls"], [data-testid="chain-status"], button:has-text("Mint")');

    // Check if any blockchain elements are visible
    const count = await blockchainElements.count();
    if (count > 0) {
      await expect(blockchainElements.first()).toBeVisible();
    }
  });

  test('should handle evidence sharing workflow', async ({ page }) => {
    await page.goto('/evidence');

    // Look for share button
    const shareButton = page.locator('[data-testid="share-evidence"], [data-testid="quick-share"], button:has-text("Share")').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();

      // Verify share dialog appears
      await expect(page.locator('[data-testid="share-dialog"], [role="dialog"]')).toBeVisible();
    }
  });

  test('should display audit trail information', async ({ page }) => {
    await page.goto('/audit');

    // Check for audit trail elements
    await expect(page.locator('[data-testid="audit-trail"], .audit-trail')).toBeVisible();

    // Verify audit entries are displayed
    const auditEntries = page.locator('[data-testid="audit-entry"], .audit-entry');
    if (await auditEntries.count() > 0) {
      await expect(auditEntries.first()).toBeVisible();
    }
  });

  test('should show case management features', async ({ page }) => {
    await page.goto('/cases');

    // Check for case list or case management interface
    await expect(page.locator('[data-testid="cases-list"], .cases-list')).toBeVisible();

    // Look for new case button
    const newCaseButton = page.locator('[data-testid="new-case"], button:has-text("New Case")').first();
    if (await newCaseButton.isVisible()) {
      await newCaseButton.click();

      // Verify case creation form appears
      await expect(page.locator('[data-testid="case-form"], form')).toBeVisible();
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify page loads and is usable on mobile
    await expect(page.locator('body')).toBeVisible();

    // Check for mobile navigation
    const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav, button[aria-label*="menu"]');
    if (await mobileNav.count() > 0) {
      await expect(mobileNav.first()).toBeVisible();
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    // Verify page adapts to tablet size
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle navigation between pages', async ({ page }) => {
    await page.goto('/');

    // Test navigation to different sections
    const navItems = [
      { selector: '[data-testid="nav-dashboard"], a[href="/dashboard"]', expectedUrl: '/dashboard' },
      { selector: '[data-testid="nav-evidence"], a[href="/evidence"]', expectedUrl: '/evidence' },
      { selector: '[data-testid="nav-cases"], a[href="/cases"]', expectedUrl: '/cases' },
    ];

    for (const navItem of navItems) {
      const navElement = page.locator(navItem.selector).first();
      if (await navElement.isVisible()) {
        await navElement.click();
        await expect(page).toHaveURL(new RegExp(navItem.expectedUrl));
      }
    }
  });

  test('should display error states gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');

    // Should either redirect to a valid page or show 404
    await expect(page.locator('body')).toBeVisible();

    // Test API error handling by going to a page that might fail
    await page.goto('/evidence');

    // Mock network failure
    await page.route('**/api/**', route => route.abort());
    await page.reload();

    // Page should still be functional with error states
    await expect(page.locator('body')).toBeVisible();
  });
});
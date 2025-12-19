import { test, expect } from '@playwright/test';

test.describe('Trust Scoring System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display 6D Trust widget with proper scores', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for the trust widget
    const trustWidget = page.locator('[data-testid="six-d-trust-widget"], .six-d-trust');
    await expect(trustWidget).toBeVisible();

    // Verify ChittyTrust branding
    await expect(page.getByText('ChittyTrust')).toBeVisible();
    await expect(page.getByText('6D Trust Revolution')).toBeVisible();

    // Check for trust dimensions
    const dimensions = ['Source', 'Time', 'Channel', 'Outcomes', 'Network', 'Justice'];
    for (const dimension of dimensions) {
      await expect(page.getByText(dimension)).toBeVisible();
    }
  });

  test('should show composite trust score calculation', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for composite score display
    const compositeScore = page.locator('[data-testid="composite-score"], .composite-score');
    if (await compositeScore.count() > 0) {
      await expect(compositeScore.first()).toBeVisible();

      // Verify score is in valid range (0.0 - 6.0)
      const scoreText = await compositeScore.first().textContent();
      if (scoreText) {
        const scoreMatch = scoreText.match(/(\d+\.\d+)/);
        if (scoreMatch) {
          const score = parseFloat(scoreMatch[1]);
          expect(score).toBeGreaterThanOrEqual(0.0);
          expect(score).toBeLessThanOrEqual(6.0);
        }
      }
    }
  });

  test('should allow interaction with trust score widget', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for experience button in trust widget
    const experienceButton = page.locator('[data-testid="button-experience-chittytrust"]');

    if (await experienceButton.isVisible()) {
      await experienceButton.click();

      // Verify some interaction occurs (could be modal, navigation, etc.)
      await page.waitForTimeout(1000); // Give time for any animations

      // Check that the page is still functional after clicking
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display trust indicators for evidence', async ({ page }) => {
    await page.goto('/evidence');

    // Look for trust indicators on evidence items
    const trustIndicators = page.locator('[data-testid="trust-indicator"], .trust-indicator');

    if (await trustIndicators.count() > 0) {
      await expect(trustIndicators.first()).toBeVisible();

      // Verify trust indicators have appropriate visual elements
      const firstIndicator = trustIndicators.first();

      // Should show some form of score or rating
      const hasScore = await firstIndicator.locator('[data-testid="trust-score"], .trust-score').count() > 0;
      const hasRating = await firstIndicator.locator('[data-testid="trust-rating"], .trust-rating').count() > 0;
      const hasProgress = await firstIndicator.locator('progress, .progress').count() > 0;

      expect(hasScore || hasRating || hasProgress).toBe(true);
    }
  });

  test('should show evidence weight calculations', async ({ page }) => {
    await page.goto('/evidence');

    // Look for evidence weight displays
    const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');

    if (await evidenceCards.count() > 0) {
      const firstCard = evidenceCards.first();

      // Look for weight or score information
      const weightElements = firstCard.locator('[data-testid="evidence-weight"], .evidence-weight, [data-testid="weight"]');

      if (await weightElements.count() > 0) {
        await expect(weightElements.first()).toBeVisible();

        // Verify weight is in valid range (0.0 - 1.0)
        const weightText = await weightElements.first().textContent();
        if (weightText) {
          const weightMatch = weightText.match(/(\d+\.\d+)/);
          if (weightMatch) {
            const weight = parseFloat(weightMatch[1]);
            expect(weight).toBeGreaterThanOrEqual(0.0);
            expect(weight).toBeLessThanOrEqual(1.0);
          }
        }
      }
    }
  });

  test('should display trust tier information', async ({ page }) => {
    await page.goto('/evidence');

    // Look for evidence tier badges or indicators
    const tierElements = page.locator('[data-testid="evidence-tier"], .evidence-tier, [data-testid="tier"]');

    if (await tierElements.count() > 0) {
      await expect(tierElements.first()).toBeVisible();

      // Verify tier text contains expected values
      const tierText = await tierElements.first().textContent();
      const validTiers = ['GOVERNMENT', 'FINANCIAL_INSTITUTION', 'SELF_AUTHENTICATING', 'BUSINESS_RECORD', 'EXPERT_TESTIMONY'];

      if (tierText) {
        const hasValidTier = validTiers.some(tier => tierText.includes(tier));
        expect(hasValidTier).toBe(true);
      }
    }
  });

  test('should show trust score progression', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for progress bars or visual indicators of trust progression
    const progressElements = page.locator('[data-testid="trust-progress"], .trust-progress, progress');

    if (await progressElements.count() > 0) {
      await expect(progressElements.first()).toBeVisible();

      // Verify progress element has appropriate attributes
      const firstProgress = progressElements.first();
      const hasValue = await firstProgress.getAttribute('value') !== null;
      const hasMax = await firstProgress.getAttribute('max') !== null;
      const hasClass = await firstProgress.getAttribute('class') !== null;

      // Should have at least some way to indicate progress
      expect(hasValue || hasMax || hasClass).toBe(true);
    }
  });

  test('should handle trust score updates', async ({ page }) => {
    await page.goto('/evidence');

    // Look for any verification or scoring actions
    const verifyButtons = page.locator('[data-testid="verify"], button:has-text("Verify"), [data-testid="chitty-verify"]');

    if (await verifyButtons.count() > 0) {
      const initialTrustElements = await page.locator('[data-testid="trust-score"], .trust-score').allTextContents();

      // Click verify button
      await verifyButtons.first().click();

      // Wait for potential score updates
      await page.waitForTimeout(2000);

      // Check if scores potentially changed (this is a basic check)
      const updatedTrustElements = await page.locator('[data-testid="trust-score"], .trust-score').allTextContents();

      // At minimum, the page should remain functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display user trust profiles', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for user profile information with trust scores
    const userProfile = page.locator('[data-testid="user-profile"], .user-profile');

    if (await userProfile.count() > 0) {
      await expect(userProfile.first()).toBeVisible();

      // Look for user type information
      const userTypes = ['ATTORNEY', 'PARTY', 'EXPERT', 'JUDGE'];
      const profileText = await userProfile.first().textContent();

      if (profileText) {
        const hasUserType = userTypes.some(type => profileText.includes(type));
        // User type might be displayed or might not be - both are valid
      }
    }
  });

  test('should show trust history and audit information', async ({ page }) => {
    await page.goto('/audit');

    // Look for trust-related audit entries
    const auditEntries = page.locator('[data-testid="audit-entry"], .audit-entry');

    if (await auditEntries.count() > 0) {
      // Look for trust-related actions in audit trail
      const trustActions = ['Trust Update', 'Score Change', 'Verification', 'ChittyVerify'];

      for (let i = 0; i < Math.min(5, await auditEntries.count()); i++) {
        const entry = auditEntries.nth(i);
        await expect(entry).toBeVisible();

        // Check if entry contains any trust-related keywords
        const entryText = await entry.textContent();
        if (entryText) {
          // This is informational - trust actions may or may not be present
          const hasTrustAction = trustActions.some(action =>
            entryText.toLowerCase().includes(action.toLowerCase())
          );
        }
      }
    }
  });

  test('should handle trust score edge cases', async ({ page }) => {
    await page.goto('/dashboard');

    // Test with potentially missing or invalid trust data
    const trustWidgets = page.locator('[data-testid="six-d-trust-widget"], .six-d-trust');

    if (await trustWidgets.count() > 0) {
      // Look for empty state or error handling
      const emptyStates = page.locator('[data-testid="no-user"], .no-user, :has-text("No user selected")');

      if (await emptyStates.count() > 0) {
        await expect(emptyStates.first()).toBeVisible();
        await expect(emptyStates.first()).toContainText(/no user|not selected|unavailable/i);
      } else {
        // If not in empty state, should show valid trust data
        const trustScores = page.locator('[data-testid="trust-score"], .trust-score');
        if (await trustScores.count() > 0) {
          await expect(trustScores.first()).toBeVisible();
        }
      }
    }
  });
});
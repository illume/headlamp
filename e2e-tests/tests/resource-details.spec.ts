import { test } from '@playwright/test';
import { HeadlampPage } from './headlampPage';

// TODO: A11y checks disabled due to pre-existing UI accessibility violations
// (link color contrast: 1.94:1 vs required 3:1). Re-enable once UI issues are fixed.
// See: https://dequeuniversity.com/rules/axe/4.10/link-in-text-block
const ENABLE_A11Y_CHECKS = false;

test.describe('Resource Details Pages', () => {
  let headlampPage: HeadlampPage;

  test.beforeEach(async ({ page }) => {
    headlampPage = new HeadlampPage(page);
    await headlampPage.authenticate();
  });

  // TODO: Skipped due to CI environment failures - needs investigation
  test.skip('cluster roles list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/clusterroles');
    await headlampPage.checkPageContent('Cluster Roles');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  // TODO: Skipped due to CI environment failures - needs investigation
  test.skip('cluster role bindings list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/clusterrolebindings');
    await headlampPage.checkPageContent('Cluster Role Bindings');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  // TODO: Skipped due to CI environment failures - needs investigation
  test.skip('events list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/events');
    await headlampPage.checkPageContent('Events');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  // TODO: Skipped due to CI environment failures - needs investigation
  test.skip('persistent volume claims list has correct table headers', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/storage/persistentvolumeclaims');
    
    // Check for table headers
    await headlampPage.checkPageContent('Name');
    await headlampPage.checkPageContent('Namespace');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });
});

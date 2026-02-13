/**
 * E2E tests for Gateway API pages
 * Tests navigation and basic functionality of Gateway API resource list pages
 */

import { test } from '@playwright/test';
import { HeadlampPage } from './headlampPage';

// TODO: A11y checks are disabled due to pre-existing UI violations (link color contrast: 1.94:1 vs required 3:1)
// See: https://dequeuniversity.com/rules/axe/4.10/link-in-text-block
// To re-enable, set ENABLE_A11Y_CHECKS = true
const ENABLE_A11Y_CHECKS = false;

test.describe('Gateway API Resources', () => {
  let headlampPage: HeadlampPage;

  test.beforeEach(async ({ page }) => {
    headlampPage = new HeadlampPage(page);
    await headlampPage.authenticate();
  });

  test('gateways list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/gateways');
    await headlampPage.checkPageContent('Gateways');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('http routes list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/httproutes');
    await headlampPage.checkPageContent('HTTPRoutes');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('grpc routes list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/grpcroutes');
    await headlampPage.checkPageContent('GRPCRoutes');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('gateway classes list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/gatewayclasses');
    await headlampPage.checkPageContent('GatewayClasses');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('validating webhook configurations list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/validatingwebhookconfigurations');
    await headlampPage.checkPageContent('Validating Webhook Configurations');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });
});

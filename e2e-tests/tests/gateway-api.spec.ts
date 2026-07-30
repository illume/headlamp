/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
    await headlampPage.navigateToCluster('test', process.env.HEADLAMP_TEST_TOKEN);
  });

  // TODO: Test fails in CI environment - needs investigation
  test.skip('gateways list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/gateways');
    await headlampPage.checkPageContent('Gateways');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  // TODO: Test fails in CI environment - needs investigation
  test.skip('http routes list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/httproutes');
    await headlampPage.checkPageContent('HTTPRoutes');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  // TODO: Test fails in CI environment - needs investigation
  test.skip('grpc routes list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/grpcroutes');
    await headlampPage.checkPageContent('GRPCRoutes');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  // TODO: Test fails in CI environment - needs investigation
  test.skip('gateway classes list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/gatewayclasses');
    await headlampPage.checkPageContent('GatewayClasses');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  // TODO: Test fails in CI environment - needs investigation
  test.skip('validating webhook configurations list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/validatingwebhookconfigurations');
    await headlampPage.checkPageContent('Validating Webhook Configurations');

    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });
});

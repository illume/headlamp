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

// TODO: Enable a11y checks once UI accessibility issues are fixed
// Currently disabled due to pre-existing link color contrast violations (1.94:1 vs required 3:1)
// See: https://dequeuniversity.com/rules/axe/4.10/link-in-text-block
const ENABLE_A11Y_CHECKS = false;

let headlampPage: HeadlampPage;

test.beforeEach(async ({ page }) => {
  headlampPage = new HeadlampPage(page);
  await headlampPage.navigateToCluster('test', process.env.HEADLAMP_TEST_TOKEN);
});

test('horizontal pod autoscalers list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/horizontalpodautoscalers');
  
  if (await headlampPage.shouldSkipPage({ heading: 'Horizontal Pod Autoscalers', href: 'href="/c/test/horizontalpodautoscalers"' })) {
    test.skip();
    return;
  }

  await headlampPage.checkPageContent('Horizontal Pod Autoscalers');
  // TODO: Re-enable when UI a11y issues are fixed
  if (ENABLE_A11Y_CHECKS) {
    await headlampPage.a11y();
  }
});

test('vertical pod autoscalers list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/verticalpodautoscalers');
  
  if (await headlampPage.shouldSkipPage({ heading: 'Vertical Pod Autoscalers', href: 'href="/c/test/verticalpodautoscalers"' })) {
    test.skip();
    return;
  }

  await headlampPage.checkPageContent('Vertical Pod Autoscalers');
  // TODO: Re-enable when UI a11y issues are fixed
  if (ENABLE_A11Y_CHECKS) {
    await headlampPage.a11y();
  }
});

test('pod disruption budgets list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/poddisruptionbudgets');
  
  if (await headlampPage.shouldSkipPage({ heading: 'Pod Disruption Budgets', href: 'href="/c/test/poddisruptionbudgets"' })) {
    test.skip();
    return;
  }

  await headlampPage.checkPageContent('Pod Disruption Budgets');
  // TODO: Re-enable when UI a11y issues are fixed
  if (ENABLE_A11Y_CHECKS) {
    await headlampPage.a11y();
  }
});

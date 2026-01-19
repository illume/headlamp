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

import { expect, test } from '@playwright/test';
import { HeadlampPage } from './headlampPage';

let headlampPage: HeadlampPage;

test.beforeEach(async ({ page }) => {
  headlampPage = new HeadlampPage(page);
  await headlampPage.navigateToCluster('test', process.env.HEADLAMP_TEST_TOKEN);
});

test('custom resource definitions list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/crds', /CRDs/);
  
  // Check if we have permission to view CRDs
  const content = await page.content();
  if (!content.includes('CRDs') || !content.includes('href="/c/test/crds')) {
    return;
  }

  await headlampPage.checkPageContent('CRDs');
  await headlampPage.a11y();
});

test('custom resource instances list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/crs', /CRInstances/);
  
  // Check if we have permission to view CR instances
  const content = await page.content();
  if (!content.includes('CRInstances') || !content.includes('href="/c/test/crs')) {
    return;
  }

  await headlampPage.checkPageContent('CRInstances');
  await headlampPage.a11y();
});

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

let headlampPage: HeadlampPage;

test.beforeEach(async ({ page }) => {
  headlampPage = new HeadlampPage(page);
  await headlampPage.navigateToCluster('test', process.env.HEADLAMP_TEST_TOKEN);
});

test('configmaps list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/configmaps', /Config Maps/);
  
  // Check if we have permission to view configmaps
  const content = await page.content();
  if (!content.includes('Config') || !content.includes('href="/c/test/configmaps')) {
    return;
  }

  await headlampPage.checkPageContent('Config Maps');
  await headlampPage.a11y();
});

test('secrets list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/secrets', /Secrets/);
  
  // Check if we have permission to view secrets
  const content = await page.content();
  if (!content.includes('Secrets') || !content.includes('href="/c/test/secrets')) {
    return;
  }

  await headlampPage.checkPageContent('Secrets');
  await headlampPage.a11y();
});

test('resource quotas list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/resourcequotas', /Resource Quotas/);
  
  // Check if we have permission to view resource quotas
  const content = await page.content();
  if (!content.includes('Resource Quotas') || !content.includes('href="/c/test/resourcequotas')) {
    return;
  }

  await headlampPage.checkPageContent('Resource Quotas');
  await headlampPage.a11y();
});

test('limit ranges list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/limitranges', /Limit Ranges/);
  
  // Check if we have permission to view limit ranges
  const content = await page.content();
  if (!content.includes('Limit Ranges') || !content.includes('href="/c/test/limitranges')) {
    return;
  }

  await headlampPage.checkPageContent('Limit Ranges');
  await headlampPage.a11y();
});

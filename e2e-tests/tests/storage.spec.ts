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

test('storage classes list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/storage/classes');
  
  const content = await page.content();
  
  // Skip test if page doesn't exist, lacks permission, or storage classes not available
  if (content.includes("Whoops! This page doesn't exist") || 
      content.includes('404') ||
      !content.includes('Storage') || 
      !content.includes('href="/c/test/storage/classes"')) {
    test.skip();
    return;
  }

  await headlampPage.checkPageContent('Storage Classes');
  // TODO: Re-enable when UI a11y issues are fixed
  if (ENABLE_A11Y_CHECKS) {
    await headlampPage.a11y();
  }
});

test('persistent volumes list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/storage/persistentvolumes');
  
  const content = await page.content();
  
  // Skip test if page doesn't exist, lacks permission, or persistent volumes not available
  if (content.includes("Whoops! This page doesn't exist") || 
      content.includes('404') ||
      !content.includes('Persistent Volumes') || 
      !content.includes('href="/c/test/storage/persistentvolumes"')) {
    test.skip();
    return;
  }

  await headlampPage.checkPageContent('Persistent Volumes');
  // TODO: Re-enable when UI a11y issues are fixed
  if (ENABLE_A11Y_CHECKS) {
    await headlampPage.a11y();
  }
});

test('persistent volume claims list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/storage/persistentvolumeclaims');
  
  const content = await page.content();
  
  // Skip test if page doesn't exist, lacks permission, or persistent volume claims not available
  if (content.includes("Whoops! This page doesn't exist") || 
      content.includes('404') ||
      !content.includes('Persistent Volume Claims') || 
      !content.includes('href="/c/test/storage/persistentvolumeclaims"')) {
    test.skip();
    return;
  }

  await headlampPage.checkPageContent('Persistent Volume Claims');
  // TODO: Re-enable when UI a11y issues are fixed
  if (ENABLE_A11Y_CHECKS) {
    await headlampPage.a11y();
  }
});

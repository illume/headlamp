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

test('storage classes list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/storage/classes', /Storage Classes/);
  
  // Check if we have permission to view storage classes
  const content = await page.content();
  if (!content.includes('Storage') || !content.includes('href="/c/test/storage/classes"')) {
    return;
  }

  await headlampPage.checkPageContent('Storage Classes');
});

test('persistent volumes list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/storage/persistentvolumes', /Persistent Volumes/);
  
  // Check if we have permission to view persistent volumes
  const content = await page.content();
  if (!content.includes('Persistent Volumes') || !content.includes('href="/c/test/storage/persistentvolumes"')) {
    return;
  }

  await headlampPage.checkPageContent('Persistent Volumes');
});

test('persistent volume claims list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/storage/persistentvolumeclaims', /Persistent Volume Claims/);
  
  // Check if we have permission to view persistent volume claims
  const content = await page.content();
  if (!content.includes('Persistent Volume Claims') || !content.includes('href="/c/test/storage/persistentvolumeclaims"')) {
    return;
  }

  await headlampPage.checkPageContent('Persistent Volume Claims');
});

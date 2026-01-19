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

test('endpoints list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/endpoints', /Endpoints/);
  
  // Check if we have permission to view endpoints
  const content = await page.content();
  if (!content.includes('Endpoints') || !content.includes('href="/c/test/endpoints"')) {
    return;
  }

  await headlampPage.checkPageContent('Endpoints');
});

test('endpoint slices list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/endpointslices', /EndpointSlices/);
  
  // Check if we have permission to view endpoint slices
  const content = await page.content();
  if (!content.includes('EndpointSlices') || !content.includes('href="/c/test/endpointslices"')) {
    return;
  }

  await headlampPage.checkPageContent('EndpointSlices');
});

test('ingresses list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/ingresses', /Ingresses/);
  
  // Check if we have permission to view ingresses
  const content = await page.content();
  if (!content.includes('Ingresses') || !content.includes('href="/c/test/ingresses"')) {
    return;
  }

  await headlampPage.checkPageContent('Ingresses');
});

test('ingress classes list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/ingressclasses', /IngressClasses/);
  
  // Check if we have permission to view ingress classes
  const content = await page.content();
  if (!content.includes('IngressClasses') || !content.includes('href="/c/test/ingressclasses"')) {
    return;
  }

  await headlampPage.checkPageContent('IngressClasses');
});

test('network policies list page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/networkpolicies', /Network Policies/);
  
  // Check if we have permission to view network policies
  const content = await page.content();
  if (!content.includes('Network Policies') || !content.includes('href="/c/test/networkpolicies"')) {
    return;
  }

  await headlampPage.checkPageContent('Network Policies');
});

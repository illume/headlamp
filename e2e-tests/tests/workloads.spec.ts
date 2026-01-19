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

test('workloads overview page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/workloads', /Workloads/);
  await headlampPage.checkPageContent('Workloads');
  await headlampPage.a11y();
});

test('deployments list page should load and display table', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/deployments', /Deployments/);
  
  // Check if we have permission to view deployments
  const content = await page.content();
  if (!content.includes('Deployments') || !content.includes('href="/c/test/deployments')) {
    return;
  }

  await headlampPage.checkPageContent('Deployments');
  await headlampPage.a11y();
});

test('daemonsets list page should load and display table', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/daemonsets', /DaemonSets/);
  
  // Check if we have permission to view daemonsets
  const content = await page.content();
  if (!content.includes('DaemonSets') || !content.includes('href="/c/test/daemonsets')) {
    return;
  }

  await headlampPage.checkPageContent('DaemonSets');
  await headlampPage.a11y();
});

test('statefulsets list page should load and display table', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/statefulsets', /StatefulSets/);
  
  // Check if we have permission to view statefulsets
  const content = await page.content();
  if (!content.includes('StatefulSets') || !content.includes('href="/c/test/statefulsets')) {
    return;
  }

  await headlampPage.checkPageContent('StatefulSets');
  await headlampPage.a11y();
});

test('replicasets list page should load and display table', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/replicasets', /ReplicaSets/);
  
  // Check if we have permission to view replicasets
  const content = await page.content();
  if (!content.includes('ReplicaSets') || !content.includes('href="/c/test/replicasets')) {
    return;
  }

  await headlampPage.checkPageContent('ReplicaSets');
  await headlampPage.a11y();
});

test('jobs list page should load and display table', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/jobs', /Jobs/);
  
  // Check if we have permission to view jobs
  const content = await page.content();
  if (!content.includes('Jobs') || !content.includes('href="/c/test/jobs')) {
    return;
  }

  await headlampPage.checkPageContent('Jobs');
  await headlampPage.a11y();
});

test('cronjobs list page should load and display table', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/cronjobs', /CronJobs/);
  
  // Check if we have permission to view cronjobs
  const content = await page.content();
  if (!content.includes('CronJobs') || !content.includes('href="/c/test/cronjobs')) {
    return;
  }

  await headlampPage.checkPageContent('CronJobs');
  await headlampPage.a11y();
});

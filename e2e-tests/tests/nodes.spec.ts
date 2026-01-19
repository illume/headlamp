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

test('nodes list page should load and display table', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/nodes', /Nodes/);
  
  // Check if we have permission to view nodes
  const content = await page.content();
  if (!content.includes('Nodes') || !content.includes('href="/c/test/nodes"')) {
    return;
  }

  await headlampPage.checkPageContent('Nodes');
});

test('nodes list page should have table with expected columns', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/nodes', /Nodes/);
  
  // Check if we have permission to view nodes
  const content = await page.content();
  if (!content.includes('Nodes') || !content.includes('href="/c/test/nodes"')) {
    return;
  }

  const expectedHeaders = ['Name', 'Ready', 'CPU', 'Memory'];
  await headlampPage.tableHasHeaders('table', expectedHeaders);
});

test('node details page should load', async ({ page }) => {
  await headlampPage.navigateTopage('/c/test/nodes', /Nodes/);
  
  // Check if we have permission to view nodes
  const content = await page.content();
  if (!content.includes('Nodes') || !content.includes('href="/c/test/nodes"')) {
    return;
  }

  // Get the first node from the table and navigate to it
  const nodesTable = page.getByRole('table');
  await expect(nodesTable).toBeVisible();

  const firstNodeLink = nodesTable
    .locator('tbody')
    .nth(0)
    .locator('tr')
    .nth(0)
    .locator('td')
    .nth(0)
    .locator('a');

  const nodeName = await firstNodeLink.textContent();
  
  if (nodeName) {
    await firstNodeLink.click();
    await page.waitForLoadState('load');
    
    // Check that we're on the node details page
    const nodeHeading = page.getByRole('heading', { level: 1, name: new RegExp(nodeName) });
    await expect(nodeHeading).toBeVisible();
  }
});

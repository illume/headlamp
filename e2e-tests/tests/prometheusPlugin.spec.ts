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

// The Prometheus plugin is bundled in the Docker image via container/build-manifest.json
// and in the App via app/app-build-manifest.json. These tests verify it is present and working.

test('prometheus plugin is bundled', async ({ page }) => {
  const headlampPage = new HeadlampPage(page);
  await headlampPage.navigateToCluster('test', process.env.HEADLAMP_TEST_TOKEN);

  // Query the plugins endpoint to verify Prometheus is bundled.
  // The Docker image includes it as a static plugin (container/build-manifest.json).
  // The App includes it via app/app-build-manifest.json.
  // If this assertion fails, the plugin is missing from the build — that's a bug.
  const pluginsResponse = await page.request.get('/plugins');
  const plugins = await pluginsResponse.json();
  expect(Array.isArray(plugins), '/plugins should return an array').toBeTruthy();

  const prometheusPlugin = plugins.find(
    (p: { name?: string; path?: string }) =>
      (p.name && p.name.toLowerCase().includes('prometheus')) ||
      (p.path && p.path.toLowerCase().includes('prometheus'))
  );
  expect(prometheusPlugin, 'Prometheus plugin should be bundled in the image/app').toBeTruthy();
});

test('prometheus plugin section is displayed on pod detail page', async ({ page }) => {
  const headlampPage = new HeadlampPage(page);
  await headlampPage.navigateToCluster('test', process.env.HEADLAMP_TEST_TOKEN);

  // Navigate to the pods page
  await headlampPage.navigateTopage('/c/test/pods', /Pods/);

  // Wait for the pods table to be visible
  const podsTable = page.getByRole('table');
  await expect(podsTable).toBeVisible();

  // Click on the first pod to go to its detail page
  const podLink = podsTable
    .locator('tbody')
    .nth(0)
    .locator('tr')
    .nth(0)
    .locator('td')
    .nth(1)
    .locator('a');
  const podName = await podLink.textContent();
  await podLink.click();

  // Verify we're on the pod detail page
  const podHeading = page.getByRole('heading', {
    level: 1,
    name: new RegExp(`^Pod: ${podName}$`),
  });
  await expect(podHeading).toBeVisible();

  // Verify the Prometheus plugin section is displayed on the pod detail page.
  // The Prometheus plugin registers a details view section via registerDetailsViewSection().
  // It renders a heading containing "Prometheus" when installed and active.
  const prometheusSection = page.locator('text=Prometheus').first();
  await expect(prometheusSection).toBeVisible({ timeout: 10000 });
});

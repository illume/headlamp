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

test('event filters persist and chart drill-down creates a static snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('event-filters-test-initialized')) {
      localStorage.removeItem('headlamp.events.filters.v1');
      sessionStorage.setItem('event-filters-test-initialized', 'true');
    }
  });
  await page.goto('/iframe.html?id=cluster-overview--events&viewMode=story');

  const search = page.getByRole('textbox', { name: 'Search events' });
  await search.fill('*nginx-deployment-abcd*');
  await expect(page.getByText('nginx-deployment-abcd-1234567890')).toBeVisible();
  await expect(page.getByText('hello-123-123')).toHaveCount(0);

  await page.reload();
  await expect(search).toHaveValue('*nginx-deployment-abcd*');

  await search.fill('');
  await page.getByRole('button', { name: /Pod: 2/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Resume live events' })).toBeVisible();
});

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
import { runA11yScan } from '../tests/a11yHelper';

test('event filters persist and chart drill-down creates a static snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('event-filters-test-initialized')) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('headlamp.events.filters.v1'))
        .forEach(key => localStorage.removeItem(key));
      localStorage.setItem('EVENT_WARNING_SWITCH_FILTER_STORAGE_KEY', 'invalid-json');
      sessionStorage.setItem('event-filters-test-initialized', 'true');
    }
  });
  await page.goto('/iframe.html?id=cluster-overview--large-events&viewMode=story');

  const search = page.getByRole('textbox', { name: 'Search events' });
  await expect(page.getByRole('checkbox', { name: /Only warnings/ })).toBeChecked();
  const filterStartedAt = Date.now();
  await search.fill('*UNIQUE*message');
  await expect(page.locator('#load-event-1999')).toBeVisible();
  expect(Date.now() - filterStartedAt).toBeLessThan(5000);
  await expect(page.getByText('Load-test event 1')).toHaveCount(0);

  await page.reload();
  await expect(search).toHaveValue('*UNIQUE*message');

  await search.fill('');
  await expect(
    page.getByRole('status').filter({ hasText: 'Live events. Showing 2000 matching events.' })
  ).toHaveCount(1);

  await page.getByRole('button', { name: 'Pod: 1000', exact: true }).click();
  const resume = page.getByRole('button', { name: 'Resume live events' });
  await expect(resume).toBeVisible();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Static event snapshot. Showing 1000 matching events.' })
  ).toHaveCount(1);

  await resume.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pause live events' })).toBeFocused();
});

test('event details remain available at 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/iframe.html?id=cluster-overview--large-events&viewMode=story');

  await page.getByRole('textbox', { name: 'Search events' }).fill('*UNIQUE*message');
  const eventRow = page.getByRole('row').filter({ hasText: 'Unique load-test message' });

  await expect(eventRow.getByText('pod-1999')).toBeVisible();
  await expect(eventRow.getByText('FailedScheduling')).toBeVisible();
  await expect(eventRow.getByText('node-249')).toBeVisible();
  await expect(eventRow.getByText('Unique load-test message').first()).toBeVisible();
  await runA11yScan(page, expect, ['#storybook-root']);
});

test('event messages remain visible in a narrow table at desktop viewport widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/iframe.html?id=cluster-overview--large-events&viewMode=story');
  await page.addStyleTag({ content: '#storybook-root { width: 760px; }' });

  await page.getByRole('textbox', { name: 'Search events' }).fill('*UNIQUE*message');
  const eventRow = page.getByRole('row').filter({ hasText: 'pod-1999' });
  await expect(page.getByRole('columnheader', { name: 'Message' })).toHaveCount(0);
  await expect(
    eventRow.getByRole('cell').filter({ hasText: 'pod-1999' }).getByText('Unique load-test message')
  ).toBeVisible();
});

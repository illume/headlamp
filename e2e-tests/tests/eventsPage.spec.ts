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

function makeEvent(index: number) {
  const kind = index % 2 ? 'Pod' : 'Deployment';
  return {
    apiVersion: 'v1',
    kind: 'Event',
    metadata: {
      name: `event-${index}`,
      namespace: 'default',
      uid: `event-${index}`,
      creationTimestamp: '2026-01-01T00:00:00Z',
    },
    involvedObject: {
      apiVersion: 'v1',
      kind,
      name: `${kind.toLowerCase()}-${index}`,
      namespace: 'default',
      uid: `${kind}-${index}`,
    },
    message: index === 1999 ? 'Unique load-test message' : `Load-test event ${index}`,
    reason: index % 2 ? 'FailedScheduling' : 'BackOff',
    source: { host: `node-${index % 250}` },
    type: 'Warning',
    lastTimestamp: '2026-01-01T00:00:00Z',
  };
}

test('filters and freezes a 2,000-event cluster snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('event-filters-test-initialized')) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('headlamp.events.filters.v1'))
        .forEach(key => localStorage.removeItem(key));
      sessionStorage.setItem('event-filters-test-initialized', 'true');
    }
  });
  await page.clock.install();
  let useUpdatedEvents = false;
  let resolveSecondEventRequest = () => {};
  const secondEventRequest = new Promise<void>(resolve => {
    resolveSecondEventRequest = resolve;
  });
  await page.route('**/clusters/test/api/v1/events*', route => {
    const items = useUpdatedEvents
      ? [makeEvent(2001)]
      : Array.from({ length: 2000 }, (_, index) => makeEvent(index));
    if (useUpdatedEvents) {
      resolveSecondEventRequest();
    }

    route.fulfill({
      json: {
        apiVersion: 'v1',
        kind: 'EventList',
        metadata: { resourceVersion: '1' },
        items,
      },
    });
  });

  const headlampPage = new HeadlampPage(page);
  await headlampPage.navigateTopage('/c/test');
  if (await page.getByRole('heading', { name: 'Authentication', exact: true }).isVisible()) {
    await headlampPage.authenticate(process.env.HEADLAMP_TEST_TOKEN);
  }

  const search = page.getByRole('textbox', { name: 'Search events' });
  await search.fill('*UNIQUE*message');
  await expect(page.locator('#event-1999')).toBeVisible();
  await expect(page.getByText('Load-test event 1')).toHaveCount(0);

  await page.reload();
  await expect(search).toHaveValue('*UNIQUE*message');

  await search.fill('');
  await page.getByRole('button', { name: 'Pod: 1000', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Resume live events' })).toBeVisible();
  await expect(page.getByText('deployment-0')).toHaveCount(0);

  useUpdatedEvents = true;
  await page.clock.fastForward(60_000);
  await secondEventRequest;
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Static event snapshot. Showing 1000 matching events.' })
  ).toHaveCount(1);
  await expect(page.locator('#event-2001')).toHaveCount(0);

  await page.getByRole('button', { name: 'Resume live events' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Live events. Showing 1 matching events.' })
  ).toHaveCount(1);
  await expect(page.locator('#event-2001')).toBeVisible();
});

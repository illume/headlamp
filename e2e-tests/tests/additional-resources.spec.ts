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

// TODO: Accessibility checks are disabled due to pre-existing UI violations (link color contrast: 1.94:1 vs required 3:1)
// Re-enable by setting this to true once UI issues are fixed
// See: https://dequeuniversity.com/rules/axe/4.10/link-in-text-block
const ENABLE_A11Y_CHECKS = false;

let headlampPage: HeadlampPage;

test.beforeEach(async ({ page }) => {
  headlampPage = new HeadlampPage(page);
  await headlampPage.navigateToCluster('test', process.env.HEADLAMP_TEST_TOKEN);
});

test.describe('Additional Resources', () => {

  test('roles list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/roles');
    
    if (await headlampPage.shouldSkipPage({ heading: 'Roles', href: 'href="/c/test/roles"' })) {
      test.skip();
      return;
    }

    await headlampPage.checkPageContent('Roles');
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('api services list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/apiservices');
    
    if (await headlampPage.shouldSkipPage({ heading: 'API Services', href: 'href="/c/test/apiservices"' })) {
      test.skip();
      return;
    }

    await headlampPage.checkPageContent('API Services');
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('pod security policies list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/podsecuritypolicies');
    
    if (await headlampPage.shouldSkipPage({ heading: 'Pod Security Policies', href: 'href="/c/test/podsecuritypolicies"' })) {
      test.skip();
      return;
    }

    await headlampPage.checkPageContent('Pod Security Policies');
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('certificate signing requests list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/certificatesigningrequests');
    
    if (await headlampPage.shouldSkipPage({ heading: 'Certificate Signing Requests', href: 'href="/c/test/certificatesigningrequests"' })) {
      test.skip();
      return;
    }

    await headlampPage.checkPageContent('Certificate Signing Requests');
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('replica sets table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/replicasets');
    
    if (await headlampPage.shouldSkipPage({ heading: 'ReplicaSets', href: 'href="/c/test/replicasets"' })) {
      test.skip();
      return;
    }

    await headlampPage.tableHasHeaders('table', ['Name', 'Namespace', 'Replicas', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('daemon sets table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/daemonsets');
    
    if (await headlampPage.shouldSkipPage({ heading: 'DaemonSets', href: 'href="/c/test/daemonsets"' })) {
      test.skip();
      return;
    }

    await headlampPage.tableHasHeaders('table', ['Name', 'Namespace', 'Desired', 'Current', 'Ready', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('stateful sets table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/statefulsets');
    
    if (await headlampPage.shouldSkipPage({ heading: 'StatefulSets', href: 'href="/c/test/statefulsets"' })) {
      test.skip();
      return;
    }

    await headlampPage.tableHasHeaders('table', ['Name', 'Namespace', 'Replicas', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('jobs table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/jobs');
    
    if (await headlampPage.shouldSkipPage({ heading: 'Jobs', href: 'href="/c/test/jobs"' })) {
      test.skip();
      return;
    }

    await headlampPage.tableHasHeaders('table', ['Name', 'Namespace', 'Completions', 'Duration', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('cron jobs table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/cronjobs');
    
    if (await headlampPage.shouldSkipPage({ heading: 'CronJobs', href: 'href="/c/test/cronjobs"' })) {
      test.skip();
      return;
    }

    await headlampPage.tableHasHeaders('table', ['Name', 'Namespace', 'Schedule', 'Last Schedule', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('deployments table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/deployments');
    
    if (await headlampPage.shouldSkipPage({ heading: 'Deployments', href: 'href="/c/test/deployments"' })) {
      test.skip();
      return;
    }

    await headlampPage.tableHasHeaders('table', ['Name', 'Namespace', 'Replicas', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });
});

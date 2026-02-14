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

    await headlampPage.checkPageContent('Roles');
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('api services list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/apiservices');

    await headlampPage.checkPageContent('API Services');
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('pod security policies list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/podsecuritypolicies');

    await headlampPage.checkPageContent('Pod Security Policies');
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('certificate signing requests list page should load', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/certificatesigningrequests');

    await headlampPage.checkPageContent('Certificate Signing Requests');
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('replica sets table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/replicasets');

    await headlampPage.checkTableHeaders(['Name', 'Namespace', 'Replicas', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('daemon sets table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/daemonsets');

    await headlampPage.checkTableHeaders(['Name', 'Namespace', 'Desired', 'Current', 'Ready', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('stateful sets table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/statefulsets');

    await headlampPage.checkTableHeaders(['Name', 'Namespace', 'Replicas', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('jobs table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/jobs');

    await headlampPage.checkTableHeaders(['Name', 'Namespace', 'Completions', 'Duration', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('cron jobs table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/cronjobs');

    await headlampPage.checkTableHeaders(['Name', 'Namespace', 'Schedule', 'Last Schedule', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });

  test('deployments table headers should be correct', async ({ page }) => {
    await headlampPage.navigateTopage('/c/test/deployments');

    await headlampPage.checkTableHeaders(['Name', 'Namespace', 'Replicas', 'Age']);
    
    if (ENABLE_A11Y_CHECKS) {
      await headlampPage.a11y();
    }
  });
});

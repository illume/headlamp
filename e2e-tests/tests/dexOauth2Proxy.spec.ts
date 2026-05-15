/*
 * Copyright 2026 The Kubernetes Authors
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

/// <reference types="node" />
/**
 * End-to-end test for the Headlamp + OAuth2-Proxy + Dex tutorial.
 *
 * This whole spec file is opt-in: it is skipped unless the environment
 * variable `HEADLAMP_TEST_DEX_OAUTH2_PROXY` is set to a truthy value
 * (`1`, `true`, `yes`). It is opt-in because it depends on a real local
 * stack (Minikube + Dex + Headlamp + OAuth2-Proxy) that takes minutes
 * to bring up — not something we want to run as part of the regular
 * e2e suite.
 *
 * Two modes are supported:
 *
 *  1. **Bring-up + tear-down by this test (recommended):**
 *     set `HEADLAMP_TEST_DEX_OAUTH2_PROXY_MANAGE=1`. The test will
 *     invoke `docs/installation/in-cluster/dex-oauth2-proxy/test-scripts/run.sh`
 *     in `beforeAll` and `cleanup.sh` in `afterAll`. This is the
 *     mode the user asked for: "use these scripts to setup Dex and
 *     oauth2-proxy, and then run some e2e tests with playwright."
 *
 *  2. **Stack already running:** if `HEADLAMP_TEST_DEX_OAUTH2_PROXY_MANAGE`
 *     is not set, the test assumes the user has already run `run.sh`
 *     by hand (or in CI) and just exercises the resulting endpoint.
 *
 * The base URL of the OAuth2-Proxy front door (default
 * `http://localhost:8080`, matching what `run.sh` port-forwards) and
 * the Dex test credentials (default `admin@example.com` / `password`,
 * matching `dex-config.yaml`) can be overridden with the
 * `HEADLAMP_TEST_DEX_OAUTH2_PROXY_URL`, `HEADLAMP_TEST_DEX_USER` and
 * `HEADLAMP_TEST_DEX_PASSWORD` env vars.
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import { expect, test } from '@playwright/test';

const ENABLED = ['1', 'true', 'yes'].includes(
  (process.env.HEADLAMP_TEST_DEX_OAUTH2_PROXY || '').toLowerCase()
);
const MANAGE_STACK = ['1', 'true', 'yes'].includes(
  (process.env.HEADLAMP_TEST_DEX_OAUTH2_PROXY_MANAGE || '').toLowerCase()
);

const BASE_URL = process.env.HEADLAMP_TEST_DEX_OAUTH2_PROXY_URL || 'http://localhost:8080';
const DEX_USER = process.env.HEADLAMP_TEST_DEX_USER || 'admin@example.com';
const DEX_PASSWORD = process.env.HEADLAMP_TEST_DEX_PASSWORD || 'password';

const SCRIPTS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'docs',
  'installation',
  'in-cluster',
  'dex-oauth2-proxy',
  'test-scripts'
);

function runScript(script: string, timeoutMs: number) {
  const scriptPath = path.join(SCRIPTS_DIR, script);
  // eslint-disable-next-line no-console
  console.log(`[dex-oauth2-proxy] running ${scriptPath}`);
  const result = spawnSync('bash', [scriptPath], {
    cwd: SCRIPTS_DIR,
    stdio: 'inherit',
    timeout: timeoutMs,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      `${script} exited with status ${result.status}` +
        (result.signal ? ` (signal ${result.signal})` : '')
    );
  }
}

test.describe('Headlamp + OAuth2-Proxy + Dex (opt-in)', () => {
  test.skip(
    !ENABLED,
    'Set HEADLAMP_TEST_DEX_OAUTH2_PROXY=1 to enable the OAuth2-Proxy + Dex e2e test'
  );

  // The login flow has shared state (cookies, redirects through 3 services), so
  // the tests in this file run serially against a single stack.
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    if (MANAGE_STACK) {
      // run.sh starts Minikube, applies RBAC, installs Helm charts, and
      // brings up the port-forward. It can take several minutes on a
      // cold machine.
      test.setTimeout(15 * 60 * 1000);
      runScript('run.sh', 15 * 60 * 1000);
    }
  });

  test.afterAll(async () => {
    if (MANAGE_STACK) {
      try {
        runScript('cleanup.sh', 5 * 60 * 1000);
      } catch (err) {
        // Cleanup failures shouldn't fail the test run; just log them.
        // eslint-disable-next-line no-console
        console.warn(`[dex-oauth2-proxy] cleanup.sh failed:`, err);
      }
    }
  });

  test('unauthenticated visit redirects to OAuth2-Proxy sign-in page', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/`);
    expect(response, 'expected a response from oauth2-proxy').not.toBeNull();
    // OAuth2-Proxy serves its "Sign in with OpenID Connect" splash page
    // for unauthenticated requests.
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('full sign-in flow lands on Headlamp Overview', async ({ page }) => {
    // Logging in via Dex (XHR redirects + cluster fetch on Headlamp) can
    // be slow under CI; give this test a generous timeout.
    test.setTimeout(2 * 60 * 1000);

    // 1. Hit the OAuth2-Proxy front door.
    await page.goto(`${BASE_URL}/`);

    // 2. Click "Sign in with OpenID Connect" → redirected to Dex.
    await page.getByRole('button', { name: /sign in/i }).click();

    // 3. Dex local-login form.
    await page.waitForURL(/\/auth(\?|\/)/, { timeout: 30 * 1000 });
    await page.locator('input[name="login"], input[type="email"]').first().fill(DEX_USER);
    await page.locator('input[name="password"], input[type="password"]').first().fill(DEX_PASSWORD);
    await page.locator('button[type="submit"], input[type="submit"]').first().click();

    // 4. After the OIDC callback, OAuth2-Proxy forwards us to Headlamp.
    //    Headlamp's Overview shows the "Cluster" sidebar section.
    await page.waitForURL(new RegExp(`^${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`), {
      timeout: 60 * 1000,
    });
    await expect(page.getByText(/cluster/i).first()).toBeVisible({ timeout: 60 * 1000 });
  });
});

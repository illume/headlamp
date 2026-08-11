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

import { expect, test } from '@playwright/test';
import { createHash } from 'crypto';
import fs from 'fs';
import { createServer, Server } from 'http';
import { AddressInfo, Socket } from 'net';
import os from 'os';
import path from 'path';
import { _electron, Page } from 'playwright';
import { HeadlampPage } from './headlampPage';
import { NamespacesPage } from './namespacesPage';

const electronExecutable = process.platform === 'win32' ? 'electron.cmd' : 'electron';
const electronPath = path.resolve(__dirname, `../../node_modules/.bin/${electronExecutable}`);
const appPath = path.resolve(__dirname, '../../');
const isolatedKubeconfig = path.join(
  os.tmpdir(),
  `headlamp-e2e-backend-token-${process.pid}.kubeconfig`,
);
const isolatedConfigDir = path.join(
  os.tmpdir(),
  `headlamp-e2e-backend-token-config-${process.pid}`,
);

let electronApp: Awaited<ReturnType<typeof _electron.launch>>;
let electronPage: Page;
let kubernetesServer: Server;
const kubernetesSockets = new Set<Socket>();

function isNamespacesRequest(url: string): boolean {
  return new URL(url).pathname === '/clusters/minikube/api/v1/namespaces';
}

function getBackendPort(): Promise<number | undefined> {
  return electronPage.evaluate(
    () => (window as Window & { headlampBackendPort?: number }).headlampBackendPort,
  );
}

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), 5000);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

test.beforeAll(async () => {
  test.skip(process.env.PLAYWRIGHT_TEST_MODE !== 'app', 'These tests only run in app mode');

  kubernetesServer = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    let body: object;

    switch (pathname) {
      case '/version':
        body = {
          major: '1',
          minor: '34',
          gitVersion: 'v1.34.0',
          gitCommit: 'headlamp-e2e',
          gitTreeState: 'clean',
          buildDate: '2026-01-01T00:00:00Z',
          goVersion: 'go1.24.0',
          compiler: 'gc',
          platform: 'linux/amd64',
        };
        break;
      case '/api':
        body = {
          apiVersion: 'v1',
          kind: 'APIVersions',
          versions: ['v1'],
          serverAddressByClientCIDRs: [],
        };
        break;
      case '/apis':
        body = { apiVersion: 'v1', kind: 'APIGroupList', groups: [] };
        break;
      case '/api/v1':
        body = {
          apiVersion: 'v1',
          kind: 'APIResourceList',
          groupVersion: 'v1',
          resources: [
            {
              name: 'namespaces',
              singularName: '',
              namespaced: false,
              kind: 'Namespace',
              verbs: ['get', 'list', 'watch'],
            },
          ],
        };
        break;
      case '/api/v1/namespaces':
        body = {
          apiVersion: 'v1',
          kind: 'NamespaceList',
          metadata: { resourceVersion: '1' },
          items: [],
        };
        break;
      case '/apis/authorization.k8s.io/v1/selfsubjectrulesreviews':
        body = {
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectRulesReview',
          status: {
            resourceRules: [{ verbs: ['*'], apiGroups: ['*'], resources: ['*'] }],
            nonResourceRules: [{ verbs: ['*'], nonResourceURLs: ['*'] }],
            incomplete: false,
          },
        };
        break;
      case '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews':
        body = {
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectAccessReview',
          status: { allowed: true },
        };
        break;
      case '/apis/authentication.k8s.io/v1/selfsubjectreviews':
        body = {
          apiVersion: 'authentication.k8s.io/v1',
          kind: 'SelfSubjectReview',
          status: { userInfo: { username: 'headlamp-e2e', groups: ['system:masters'] } },
        };
        break;
      default:
        response.statusCode = 404;
        body = {
          apiVersion: 'v1',
          kind: 'Status',
          status: 'Failure',
          reason: 'NotFound',
          code: 404,
        };
    }

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(body));
  });
  kubernetesServer.on('upgrade', (request, socket) => {
    const websocketKey = request.headers['sec-websocket-key'];
    if (typeof websocketKey !== 'string') {
      socket.destroy();
      return;
    }

    const accept = createHash('sha1')
      .update(websocketKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
    const protocol = request.headers['sec-websocket-protocol']?.split(',')[0]?.trim();
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
    ];
    if (protocol) {
      responseHeaders.push(`Sec-WebSocket-Protocol: ${protocol}`);
    }

    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
    kubernetesSockets.add(socket);
    socket.on('close', () => kubernetesSockets.delete(socket));
  });
  await new Promise<void>((resolve, reject) => {
    kubernetesServer.once('error', reject);
    kubernetesServer.listen(0, '127.0.0.1', resolve);
  });

  const kubernetesPort = (kubernetesServer.address() as AddressInfo).port;
  fs.mkdirSync(isolatedConfigDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    isolatedKubeconfig,
    `apiVersion: v1
kind: Config
clusters:
- name: minikube
  cluster:
    server: http://127.0.0.1:${kubernetesPort}
contexts:
- name: minikube
  context:
    cluster: minikube
    user: minikube
current-context: minikube
users:
- name: minikube
  user:
    token: headlamp-e2e
`,
    { mode: 0o600 },
  );

  electronApp = await _electron.launch({
    cwd: appPath,
    executablePath: electronPath,
    args: ['.'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_DEV: 'true',
      KUBECONFIG: isolatedKubeconfig,
      XDG_CONFIG_HOME: isolatedConfigDir,
    },
  });
  electronPage = await electronApp.firstWindow();
});

test.afterAll(async () => {
  await electronApp?.close();
  for (const socket of kubernetesSockets) {
    socket.destroy();
  }
  if (kubernetesServer) {
    await new Promise<void>((resolve, reject) => {
      kubernetesServer.close(error => (error ? reject(error) : resolve()));
    });
  }
  fs.rmSync(isolatedKubeconfig, { force: true });
  fs.rmSync(isolatedConfigDir, { force: true, recursive: true });
});

test.beforeEach(async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_TEST_MODE !== 'app', 'These tests only run in app mode');
  await page.close();
});

test.describe('desktop backend token', () => {
  test('rejects tokenless cluster HTTP and multiplexer WebSocket requests', async () => {
    await expect.poll(getBackendPort).toBeGreaterThan(0);
    const backendPort = (await getBackendPort())!;

    const response = await fetch(`http://localhost:${backendPort}/clusters/minikube/version`);
    expect(response.status).toBe(403);

    const websocketOpened = await electronPage.evaluate(
      port =>
        new Promise<boolean>(resolve => {
          const socket = new WebSocket(`ws://localhost:${port}/wsMultiplexer`);
          const timeout = window.setTimeout(() => {
            socket.close();
            resolve(false);
          }, 5000);

          socket.addEventListener('open', () => {
            window.clearTimeout(timeout);
            socket.close();
            resolve(true);
          });
          socket.addEventListener('error', () => {
            window.clearTimeout(timeout);
            resolve(false);
          });
        }),
      backendPort,
    );
    expect(websocketOpened).toBe(false);
  });

  test('authorizes renderer cluster HTTP and WebSocket requests', async () => {
    const headlampPage = new HeadlampPage(electronPage);
    const namespacesPage = new NamespacesPage(electronPage);
    await headlampPage.authenticate();

    const cdpSession = await electronPage.context().newCDPSession(electronPage);
    await cdpSession.send('Network.enable');

    const namespaceWebsocketRequestIds = new Set<string>();
    cdpSession.on('Network.webSocketCreated', event => {
      if (isNamespacesRequest(event.url)) {
        namespaceWebsocketRequestIds.add(event.requestId);
      }
    });
    const websocketProtocolPromise = new Promise<boolean>(resolve => {
      cdpSession.on('Network.webSocketWillSendHandshakeRequest', event => {
        if (namespaceWebsocketRequestIds.has(event.requestId)) {
          resolve(
            Object.entries(event.request.headers).some(
              ([name, value]) =>
                name.toLowerCase() === 'sec-websocket-protocol' &&
                String(value).includes('base64url.headlamp.backend.authorization.k8s.io.'),
            ),
          );
        }
      });
    });
    const websocketStatusPromise = new Promise<number>(resolve => {
      cdpSession.on('Network.webSocketHandshakeResponseReceived', event => {
        if (namespaceWebsocketRequestIds.has(event.requestId)) {
          resolve(event.response.status);
        }
      });
    });
    const responsePromise = electronPage.waitForResponse(response =>
      isNamespacesRequest(response.url()),
    );
    const websocketPromise = electronPage.waitForEvent('websocket', websocket =>
      isNamespacesRequest(websocket.url()),
    );

    await namespacesPage.navigateToNamespaces();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(Boolean(response.request().headers()['x-headlamp_backend-token'])).toBe(true);

    await websocketPromise;
    expect(
      await withTimeout(websocketProtocolPromise, 'Namespace WebSocket protocol was not captured'),
    ).toBe(true);
    expect(
      await withTimeout(websocketStatusPromise, 'Namespace WebSocket handshake was not captured'),
    ).toBe(101);
  });
});

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

import { execFileSync } from 'node:child_process';
import path from 'node:path';

const VM_IDENTIFIERS =
  /\b(?:amazon ec2|bochs|digitalocean|google compute engine|hyper-v|kvm|nutanix|parallels|qemu|virtual machine|virtualbox|vmware|xen)\b/i;

function readWindowsBIOS(): string {
  if (!process.env.SystemRoot) {
    return '';
  }

  return execFileSync(
    path.join(process.env.SystemRoot, 'System32', 'reg.exe'),
    ['query', 'HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS'],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1000,
      windowsHide: true,
    }
  );
}

export function isWindowsVM(
  currentPlatform: NodeJS.Platform = process.platform,
  readBIOS: () => string = readWindowsBIOS
): boolean {
  if (currentPlatform !== 'win32') {
    return false;
  }

  try {
    return VM_IDENTIFIERS.test(readBIOS());
  } catch {
    return false;
  }
}

export function getHardwareAccelerationDisableReason(
  disableGPU: boolean | undefined,
  currentPlatform: NodeJS.Platform = process.platform,
  currentArch: string = process.arch,
  detectWindowsVM: () => boolean = isWindowsVM
): string | undefined {
  if (disableGPU !== undefined) {
    return disableGPU ? 'related flag is set.' : undefined;
  }

  if (currentPlatform === 'linux' && ['arm', 'arm64'].includes(currentArch)) {
    return 'known graphical issues in Linux on ARM (use --disable-gpu=false to force it if needed).';
  }

  if (currentPlatform === 'win32' && detectWindowsVM()) {
    return 'running in a Windows virtual machine (use --disable-gpu=false to force it if needed).';
  }

  return undefined;
}

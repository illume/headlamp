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

export function escapeSettingsPathSegment(segment: string): string {
  return segment.replaceAll('\\', '\\\\').replaceAll('.', '\\.');
}

export function joinSettingsPath(...segments: string[]): string {
  return segments.map(escapeSettingsPathSegment).join('.');
}

export function splitSettingsPath(path: string): string[] {
  const result: string[] = [];
  let segment = '';
  let escaped = false;

  for (const character of path) {
    if (escaped) {
      segment += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '.') {
      result.push(segment);
      segment = '';
    } else {
      segment += character;
    }
  }
  if (escaped) {
    segment += '\\';
  }
  result.push(segment);
  return result;
}

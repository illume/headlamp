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

export const minZoom = 0.1;
export const maxZoom = 2.0;
export const viewportPaddingPx = 50;

/** Default node dimensions for resource map nodes.
 *  The ELK layout and viewport helpers (e.g. usePanToNode) both use these values
 *  so that sizing assumptions stay in sync. */
export const nodeDefaultWidth = 220;
export const nodeDefaultHeight = 70;

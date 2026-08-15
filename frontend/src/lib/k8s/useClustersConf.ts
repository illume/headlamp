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

import { useMemo } from 'react';
import { ConfigState } from '../../redux/configSlice';
import { useTypedSelector } from '../../redux/hooks';

/** Hook for getting or fetching the clusters configuration.
 * This gets the clusters from the redux store. The redux store is updated
 * when the user changes the configuration. The configuration is stored in
 * the local storage. When stateless clusters are present, it combines the
 * stateless clusters with the clusters from the redux store.
 * The shallow merge reuses nested values instead of deep-cloning every cluster,
 * avoiding duplicate long-lived configuration object graphs.
 * @returns the clusters configuration.
 * */
export function useClustersConf(): ConfigState['allClusters'] {
  const state = useTypedSelector(state => state.config);
  return useMemo(
    () =>
      state.clusters === null
        ? null
        : {
            ...(state.allClusters || {}),
            ...state.clusters,
            ...(state.statelessClusters || {}),
          },
    [state.allClusters, state.clusters, state.statelessClusters]
  );
}

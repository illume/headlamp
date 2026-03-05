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

import '@testing-library/jest-dom';
import { useClustersConf } from '@kinvolk/headlamp-plugin/lib';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

/** A simple component that uses useClustersConf to display cluster names. */
function ClusterList() {
  const clusters = useClustersConf();
  if (!clusters) return <div>No clusters</div>;
  return (
    <div>
      {Object.keys(clusters).map(name => (
        <span key={name}>{name}</span>
      ))}
    </div>
  );
}

describe('useClustersConf', () => {
  it('returns null when clusters have not been loaded', () => {
    const store = configureStore({
      reducer: {
        config: () => ({
          clusters: null,
          allClusters: null,
          statelessClusters: null,
          settings: {},
        }),
      },
    });

    render(
      <Provider store={store}>
        <ClusterList />
      </Provider>
    );

    expect(screen.getByText('No clusters')).toBeInTheDocument();
  });

  it('returns clusters from the store', () => {
    const store = configureStore({
      reducer: {
        config: () => ({
          clusters: {
            'my-cluster': { name: 'my-cluster' },
          },
          allClusters: {},
          statelessClusters: null,
          settings: {},
        }),
      },
    });

    render(
      <Provider store={store}>
        <ClusterList />
      </Provider>
    );

    expect(screen.getByText('my-cluster')).toBeInTheDocument();
  });

  it('combines stateless clusters with regular clusters', () => {
    const store = configureStore({
      reducer: {
        config: () => ({
          clusters: {
            'regular-cluster': { name: 'regular-cluster' },
          },
          allClusters: {},
          statelessClusters: {
            'stateless-cluster': { name: 'stateless-cluster' },
          },
          settings: {},
        }),
      },
    });

    render(
      <Provider store={store}>
        <ClusterList />
      </Provider>
    );

    expect(screen.getByText('regular-cluster')).toBeInTheDocument();
    expect(screen.getByText('stateless-cluster')).toBeInTheDocument();
  });
});

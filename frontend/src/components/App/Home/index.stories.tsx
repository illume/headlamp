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

import { configureStore } from '@reduxjs/toolkit';
import { Meta, StoryFn } from '@storybook/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { headlampApi } from '../../../redux/headlampApi';
import { initialState } from '../../../redux/configSlice';
import shortcutsReducer from '../../../redux/shortcutsSlice';
import Home from '.';

const ourState = {
  config: {
    ...initialState,
    clusters: [
      {
        name: 'cluster0',
      },
      {
        name: 'cluster2',
      },
      {
        name: 'cluster1',
      },
    ],
  },
  filter: {
    search: '',
  },
  resourceTable: {
    tableColumnsProcessors: [],
  },
  clusterProvider: {
    dialogs: {},
    menuItems: [],
    clusterProviders: [],
    clusterStatuses: [],
  },
  drawerMode: {
    isDetailDrawerEnabled: false,
  },
  shortcuts: { ...shortcutsReducer(undefined, { type: '' }) },
};

const createHomeStore = (state: Record<string, any>) =>
  configureStore({
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ serializableCheck: false }).concat(headlampApi.middleware),
    reducer: {
      config: (s = state.config) => s,
      filter: (s = state.filter) => s,
      resourceTable: (s = state.resourceTable) => s,
      clusterProvider: (s = state.clusterProvider) => s,
      drawerMode: (s = state.drawerMode) => s,
      shortcuts: (s = state.shortcuts) => s,
      [headlampApi.reducerPath]: headlampApi.reducer,
    },
  });

// @todo: Add a way for the results from useClustersVersion to be mocked, so not
// all clusters appear as not accessible.
export default {
  title: 'Home/Home',
  component: Home,
} as Meta;

const Template: StoryFn = () => <Home />;

export const Base = Template.bind({});
Base.decorators = [
  Story => {
    return (
      <MemoryRouter>
        <Provider store={createHomeStore(ourState)}>
          <Story />
        </Provider>
      </MemoryRouter>
    );
  },
];

const loadingState = {
  ...ourState,
  config: {
    ...ourState.config,
    clusters: null as any,
  },
};

export const LoadingClusters = Template.bind({});
LoadingClusters.decorators = [
  Story => {
    return (
      <MemoryRouter>
        <Provider store={createHomeStore(loadingState)}>
          <Story />
        </Provider>
      </MemoryRouter>
    );
  },
];

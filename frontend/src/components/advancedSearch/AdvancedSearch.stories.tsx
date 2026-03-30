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

import { Meta, StoryFn } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { TestContext } from '../../test';
import { AdvancedSearch } from './AdvancedSearch';

export default {
  title: 'AdvancedSearch/AdvancedSearch',
  component: AdvancedSearch,
  argTypes: {},
  parameters: {
    storyshots: { waitForText: 'Select Resources' },
    msw: {
      handlers: {
        storyBase: [
          http.get(
            'http://localhost:4466/apis/apiextensions.k8s.io/v1/customresourcedefinitions',
            () =>
              HttpResponse.json({
                kind: 'CustomResourceDefinitionList',
                items: [],
                metadata: {},
              })
          ),
        ],
      },
    },
  },
} as Meta;

const Template: StoryFn = args => (
  <TestContext>
    <AdvancedSearch {...args} />
  </TestContext>
);

export const Default = Template.bind({});
Default.args = {};

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

// Bench-only Storybook preview shared by .storybook-rsbuild-bench/ and
// .storybook-vite-bench/.
//
// This is INTENTIONALLY simpler than the production preview at
// frontend/.storybook/preview.tsx — in particular it does NOT initialize
// msw-storybook-addon. The bench measures bundler/dev-server performance,
// and msw-storybook-addon's `worker.start({ waitUntilReady: true })` has a
// timing-sensitive Service-Worker registration that races with Storybook's
// lazy chunk imports under both vite and rsbuild on cold caches, hiding
// the bundler differences we actually want to measure. The production
// Storybook (.storybook/preview.tsx) keeps MSW enabled.
//
// We still apply the ThemeProvider + QueryClient decorators so stories
// that import them render at all.

import { ThemeProvider } from '@mui/material/styles';
import '../src/index.css';
import { Title, Subtitle, Description, Primary, Controls } from '@storybook/addon-docs/blocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { darkTheme, lightTheme } from '../src/components/App/defaultAppThemes';
import { createMuiTheme } from '../src/lib/themes';
import App from '../src/App';

// App import will load the whole app dependency tree
// And assigning it to a value will make sure it's not tree-shaken and removed
const DontDeleteMe = App;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: 'always',
      staleTime: 0,
      retry: false,
      gcTime: 0,
    },
  },
});

const withThemeProvider = (Story: any, context: any) => {
  const theme = context.globals.backgrounds?.value === '#1f1f1f' ? darkTheme : lightTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={createMuiTheme(theme)}>
        <Story {...context} />
      </ThemeProvider>
    </QueryClientProvider>
  );
};
export const decorators = [withThemeProvider];

export const parameters = {
  backgrounds: {
    values: [
      { name: 'light', value: '#FFF' },
      { name: 'dark', value: '#1f1f1f' },
    ],
  },

  docs: {
    toc: { disable: true },
    page: () => (
      <>
        <Title />
        <Subtitle />
        <Description />
        <Primary />
        <Controls />
      </>
    ),
  },
};

export const tags = ['autodocs'];

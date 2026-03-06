/*
 * Override vite/client's *.svg module declaration.
 * vite/client types SVG imports as strings, but headlamp uses vite-plugin-svgr
 * which transforms SVG imports into React components at build time.
 */
declare module '*.svg' {
  import * as React from 'react';
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

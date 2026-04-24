import React from 'react';
import { createMicroApp, MicroAppManifest } from '../components';
import type { MapProps } from '../components/map/map';
import { MapEventsProvider } from '../components/map/map-events-context';

export default function createMapApp(config: MapProps): MicroAppManifest {
  const inner = createMicroApp(
    'map',
    'Map',
    () => import('../components/map/map'),
    () => config,
  );

  return {
    ...inner,
    Component: React.forwardRef<HTMLDivElement, React.ComponentProps<typeof inner.Component>>(
      (props, ref) =>
        React.createElement(
          MapEventsProvider,
          null,
          React.createElement(inner.Component, { ...props, ref }),
        ),
    ) as typeof inner.Component,
  };
}

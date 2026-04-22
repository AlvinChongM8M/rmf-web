import React, { Suspense } from 'react';

import { Window, WindowCloseButton, WindowProps } from '../components/window';
import { useAppController, useSettings } from '../hooks';
import { Settings } from '../services';

export interface MicroAppProps extends Omit<WindowProps, 'title' | 'children'> {
  /**
   * If true, the toolbar (including title) will be hidden, showing only a close button.
   */
  hideToolbar?: boolean;
}

export interface MicroAppManifest {
  appId: string;
  displayName: string;
  Component: React.ComponentType<MicroAppProps>;
}

/**
 * Creates a micro app from a component. The component must be loaded using dynamic import.
 * Note that the micro app should be created in a different module than the component.
 *
 * Example:
 * ```ts
 * createMicroApp('Map', 'Map', () => import('./map'), config);
 * ```
 */
export function createMicroApp<P>(
  appId: string,
  displayName: string,
  loadComponent: () => Promise<{ default: React.ComponentType<P> }>,
  props: (
    settings: Settings,
    updateSettings: (settings: Settings) => void,
  ) => React.PropsWithoutRef<P> & React.Attributes,
): MicroAppManifest {
  const LazyComponent = React.lazy(loadComponent);

  return {
    appId,
    displayName,
    Component: React.forwardRef<HTMLDivElement>(
      (
        { children, onClose, hideToolbar, ...otherProps }: React.PropsWithChildren<MicroAppProps>,
        ref,
      ) => {
        const settings = useSettings();
        const { updateSettings } = useAppController();

        const minimalToolbar = (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px' }}>
            <WindowCloseButton onClick={() => onClose && onClose()} />
          </div>
        );

        return (
          <Window
            ref={ref}
            title={displayName}
            toolbar={hideToolbar ? minimalToolbar : undefined}
            onClose={onClose}
            {...otherProps}
          >
            <Suspense fallback={null}>
              <LazyComponent {...props(settings, updateSettings)} />
            </Suspense>
            {/* this contains the resize handle */}
            {children}
          </Window>
        );
      },
    ) as React.ComponentType<MicroAppProps>,
  };
}

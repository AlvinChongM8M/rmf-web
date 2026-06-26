import { createTheme, ThemeProvider } from '@mui/material';
import React from 'react';

import { Map, type MapProps } from 'rmf-dashboard-framework/components/map';
import { MapEventsProvider } from 'rmf-dashboard-framework/components/map-events';
import {
  AppControllerProvider,
  AuthenticatorProvider,
  ResourcesProvider,
  RmfApiProvider,
  SettingsProvider,
  type AppController,
} from 'rmf-dashboard-framework/hooks';
import {
  DefaultRmfApi,
  loadSettings,
  StubAuthenticator,
} from 'rmf-dashboard-framework/services';
import { getAtasAmrStatusStyle } from '../atas-amr-status-style';

// ---------------------------------------------------------------------------
// Dark theme for MUI components rendered inside the map (controls, overlays)
// ---------------------------------------------------------------------------
const darkTheme = createTheme({ palette: { mode: 'dark' } });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AtasLiveMapProps {
  /** URL of the RMF API server  e.g. "http://localhost:8000" */
  apiServerUrl: string;
  /** URL of the RMF trajectory server  e.g. "http://localhost:8006" */
  trajectoryServerUrl: string;
  /** Map level to show on first render.  Default: 'L1' */
  mapLevel?: string;
  /** Initial zoom level.  Default: 4 */
  defaultZoom?: number;
  /** Zoom level when centering on a robot.  Default: 10 */
  defaultRobotZoom?: number;
  /** Layer names to hide by default. */
  defaultHiddenLayers?: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AtasLiveMap  —  self-contained live RMF map for the ATAS system overview.
 *
 * Sets up all required RMF context providers internally so it can be dropped
 * into any page without extra wrapper components.
 *
 * The parent element must have explicit dimensions (width + height) and
 * `position: relative` so that the map's overlay controls render correctly.
 */
export function AtasLiveMap({
  apiServerUrl,
  trajectoryServerUrl,
  mapLevel = 'L1',
  defaultZoom = 4,
  defaultRobotZoom = 10,
  defaultHiddenLayers = [
    'Pickup & Dropoff labels',
    'Waypoint labels',
    'Doors labels',
    'Robots labels',
  ],
}: AtasLiveMapProps) {
  // Stable references — recreated only when URLs change
  const authenticator = React.useMemo(() => new StubAuthenticator(), []);
  const rmfApi = React.useMemo(
    () => new DefaultRmfApi(apiServerUrl, trajectoryServerUrl, authenticator),
    [apiServerUrl, trajectoryServerUrl, authenticator],
  );
  const settings = React.useMemo(() => loadSettings(), []);
  const appController = React.useMemo<AppController>(
    () => ({
      updateSettings: () => {},
      showAlert: (severity, message) => console.warn(`[AtasLiveMap] ${severity}: ${message}`),
      setExtraAppbarItems: () => {},
    }),
    [],
  );
  const robotColorProvider = React.useCallback<NonNullable<MapProps['robotColorProvider']>>(
    ({ robotState, defaultColor }) => {
      const statusStyle = getAtasAmrStatusStyle(robotState.status);
      return {
        color: statusStyle.mapColor || defaultColor,
        outlineColor: statusStyle.mapOutlineColor,
      };
    },
    [],
  );

  const mapProps: MapProps = {
    attributionPrefix: 'ATAS',
    defaultMapLevel: mapLevel,
    defaultZoom,
    defaultRobotZoom,
    defaultHiddenLayers,
    trajectoryStyle: {
      glowLineWidth: 14,
      coreLineWidth: 6,
      pulseLineWidth: 12,
    },
    robotColorProvider,
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <AuthenticatorProvider value={authenticator}>
        <ResourcesProvider value={{ fleets: {}, logos: { header: '' } }}>
          <RmfApiProvider value={rmfApi}>
            <SettingsProvider value={settings}>
              <AppControllerProvider value={appController}>
                <MapEventsProvider>
                  <Map {...mapProps} />
                </MapEventsProvider>
              </AppControllerProvider>
            </SettingsProvider>
          </RmfApiProvider>
        </ResourcesProvider>
      </AuthenticatorProvider>
    </ThemeProvider>
  );
}

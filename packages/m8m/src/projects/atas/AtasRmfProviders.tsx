import { createTheme, ThemeProvider } from '@mui/material';
import React from 'react';

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
  StubAuthenticator,
  loadSettings,
} from 'rmf-dashboard-framework/services';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

interface AtasRmfProvidersProps {
  apiServerUrl: string;
  trajectoryServerUrl: string;
  children: React.ReactNode;
}

export function AtasRmfProviders({
  apiServerUrl,
  trajectoryServerUrl,
  children,
}: AtasRmfProvidersProps): JSX.Element {
  const authenticator = React.useMemo(() => new StubAuthenticator(), []);
  const rmfApi = React.useMemo(
    () => new DefaultRmfApi(apiServerUrl, trajectoryServerUrl, authenticator),
    [apiServerUrl, trajectoryServerUrl, authenticator],
  );
  const settings = React.useMemo(() => loadSettings(), []);
  const appController = React.useMemo<AppController>(
    () => ({
      updateSettings: () => {},
      showAlert: (severity, message) => console.warn(`[AtasRmfProviders] ${severity}: ${message}`),
      setExtraAppbarItems: () => {},
    }),
    [],
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <AuthenticatorProvider value={authenticator}>
        <ResourcesProvider value={{ fleets: {}, logos: { header: '' } }}>
          <RmfApiProvider value={rmfApi}>
            <SettingsProvider value={settings}>
              <AppControllerProvider value={appController}>{children}</AppControllerProvider>
            </SettingsProvider>
          </RmfApiProvider>
        </ResourcesProvider>
      </AuthenticatorProvider>
    </ThemeProvider>
  );
}
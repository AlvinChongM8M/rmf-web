import { Alert, createTheme, Snackbar, ThemeProvider } from '@mui/material';
import type { AlertProps } from '@mui/material';
import React from 'react';

import {
  AppControllerProvider,
  AuthenticatorProvider,
  ResourcesProvider,
  RmfApiProvider,
  SettingsProvider,
  UserProfileProvider,
  type AppController,
} from 'rmf-dashboard-framework/hooks';
import {
  DefaultRmfApi,
  StubAuthenticator,
  loadSettings,
  type UserProfile,
} from 'rmf-dashboard-framework/services';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

interface AtasRmfProvidersProps {
  apiServerUrl: string;
  trajectoryServerUrl: string;
  username: string;
  userRole: string;
  children: React.ReactNode;
}

interface FrameworkAlert {
  severity: AlertProps['severity'];
  message: string;
  autoHideDuration?: number;
}

export function AtasRmfProviders({
  apiServerUrl,
  trajectoryServerUrl,
  username,
  userRole,
  children,
}: AtasRmfProvidersProps): JSX.Element {
  const authenticator = React.useMemo(() => new StubAuthenticator(), []);
  const [alert, setAlert] = React.useState<FrameworkAlert | null>(null);
  const rmfApi = React.useMemo(
    () => new DefaultRmfApi(apiServerUrl, trajectoryServerUrl, authenticator),
    [apiServerUrl, trajectoryServerUrl, authenticator],
  );
  const settings = React.useMemo(() => loadSettings(), []);
  const userProfile = React.useMemo<UserProfile>(
    () => ({
      user: {
        username,
        is_admin: userRole.toLowerCase().includes('admin'),
        roles: userRole ? [userRole] : [],
      },
      permissions: [],
    }),
    [username, userRole],
  );
  const appController = React.useMemo<AppController>(
    () => ({
      updateSettings: () => {},
      showAlert: (severity, message, autoHideDuration) => {
        console.warn(`[AtasRmfProviders] ${severity}: ${message}`);
        setAlert({ severity, message, autoHideDuration });
      },
      setExtraAppbarItems: () => {},
    }),
    [],
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <AuthenticatorProvider value={authenticator}>
        <UserProfileProvider value={userProfile}>
          <ResourcesProvider value={{ fleets: {}, logos: { header: '' } }}>
            <RmfApiProvider value={rmfApi}>
              <SettingsProvider value={settings}>
                <AppControllerProvider value={appController}>{children}</AppControllerProvider>
              </SettingsProvider>
            </RmfApiProvider>
          </ResourcesProvider>
        </UserProfileProvider>
      </AuthenticatorProvider>
      <Snackbar
        open={alert !== null}
        autoHideDuration={alert?.autoHideDuration ?? 6000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') {
            setAlert(null);
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={alert?.severity ?? 'info'} onClose={() => setAlert(null)}>
          {alert?.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

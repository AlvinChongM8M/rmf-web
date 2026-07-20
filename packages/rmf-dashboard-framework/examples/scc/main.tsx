import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { Alert, Box, Button, Fab, Tooltip, Typography, createTheme } from '@mui/material';
import type { LiftState } from 'api-client';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  InitialWindow,
  // LocallyPersistentWorkspace,
  QuickDispatchButton,
  RmfDashboard,
  Workspace,
} from 'rmf-dashboard-framework/components';
import { useRmfApi } from 'rmf-dashboard-framework/hooks';
import {
  createMapApp,
  liftsApp,
  robotMutexGroupsApp,
  robotsApp,
  tasksApp,
  createTasksCompactApp,
} from 'rmf-dashboard-framework/micro-apps';
import { StubAuthenticator } from 'rmf-dashboard-framework/services';
import { LiftState as RmfLiftState } from 'rmf-models/ros/rmf_lift_msgs/msg';

/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/ban-ts-comment */
// Polar Night
const nord0 = '#2e3440'; // @ts-ignore
const nord1 = '#3b4252'; // @ts-ignore
const nord2 = '#434c5e'; // @ts-ignore
const nord3 = '#4c566a'; // @ts-ignore

// Snow Storm
const nord4 = '#d8dee9'; // @ts-ignore
const nord5 = '#e5e9f0'; // @ts-ignore
const nord6 = '#eceff4'; // @ts-ignore

// Frost
const nord7 = '#8fbcbb'; // @ts-ignore
const nord8 = '#88c0d0'; // @ts-ignore
const nord9 = '#81a1c1'; // @ts-ignore
const nord10 = '#5e81ac'; // @ts-ignore

// Aurora
const nord11 = '#bf616a'; // @ts-ignore
const nord12 = '#d08770'; // @ts-ignore
const nord13 = '#ebcb8b'; // @ts-ignore
const nord14 = '#a3be8c'; // @ts-ignore
const nord15 = '#b48ead'; // @ts-ignore
/* eslint-enable @typescript-eslint/no-unused-vars,@typescript-eslint/ban-ts-comment */

const nordTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: nord8,
      contrastText: nord1,
    },
    secondary: {
      main: nord9,
    },
    text: {
      primary: nord4,
      secondary: nord6,
      disabled: nord5,
    },
    error: {
      main: nord11,
    },
    warning: {
      main: nord13,
    },
    success: {
      main: nord14,
    },
    background: { default: nord0, paper: nord1 },
  },
});

const mapL1App = createMapApp({
  attributionPrefix: 'M8M',
  defaultMapLevel: 'L1',
  defaultRobotZoom: 10,
  defaultZoom: 20,
  defaultHiddenLayers: [
    'Pickup & Dropoff labels',
    'Waypoint labels',   // leave this out to show waypoints by default
    'Doors labels',
    'Robots labels',
    // 'Trajectories',
    // 'Waypoints',         // leave this out to show waypoints by default
    // 'Robots',            // leave this out to show robots by default
  ],
});

const mapL2App = createMapApp({
  attributionPrefix: 'M8M',
  defaultMapLevel: 'L1',
  defaultRobotZoom: 20,
  defaultZoom: 26,
  defaultHiddenLayers: [
    'Pickup & Dropoff labels',
    'Waypoint labels',  // leave this out to show waypoints by default
    'Doors labels',
    'Robots labels',
    // 'Trajectories',
    // 'Waypoints',         // leave this out to show waypoints by default
    // 'Robots',            // leave this out to show robots by default
  ],
});

const doneTasksApp = createTasksCompactApp({ statusFilter: 'cancelled,completed,failed' });

const activeTasksApp = createTasksCompactApp({
  statusFilter: 'uninitialized,blocked,queued,standby,underway,delayed,skipped,killed',
});

// const appRegistry: MicroAppManifest[] = [
//   mapL1App,
//   mapL2App,
//   doorsApp,
//   liftsApp,
//   robotsApp,
//   robotMutexGroupsApp,
//   tasksApp,
//   tasksCompactApp,
//   doneTasksApp,
//   activeTasksApp,
// ];

const overviewWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 6, h: 1.4 }, microApp: robotsApp, hideToolbar: true },
  { layout: { x: 7, y: 0, w: 6, h: 1.4 }, microApp: activeTasksApp, hideToolbar: true },
  // { layout: { x: 0, y: 0, w: 12, h: 2.4 }, microApp: mapL1App, hideToolbar: true },
  // { layout: { x: 0, y: 0, w: 12, h: 2 }, microApp: liftsApp },
];

const taskMapWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 12, h: 1.5 }, microApp: activeTasksApp, hideToolbar: true },
  { layout: { x: 0, y: 0, w: 12, h: 2.0 }, microApp: mapL1App, hideToolbar: true },
  // { layout: { x: 0, y: 0, w: 12, h: 2 }, microApp: liftsApp },
];

const mapFullscreenWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 12, h: 4 }, microApp: mapL1App, hideToolbar: true },
];

const mapMultiFloorWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 12, h: 2.5 }, microApp: mapL1App, hideToolbar: true },
  { layout: { x: 0, y: 0, w: 12, h: 2.5 }, microApp: mapL2App, hideToolbar: true },
];

const robotsWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 7, h: 4 }, microApp: robotsApp, hideToolbar: false },
  { layout: { x: 8, y: 0, w: 5, h: 8 }, microApp: mapL1App, hideToolbar: false },
  { layout: { x: 0, y: 0, w: 7, h: 4 }, microApp: liftsApp, hideToolbar: false },
  // { layout: { x: 8, y: 0, w: 5, h: 4 }, microApp: robotMutexGroupsApp, hideToolbar: false },
];

const multipurposeWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 7, h: 3 }, microApp: tasksApp },
  { layout: { x: 8, y: 0, w: 5, h: 3 }, microApp: mapL1App },
  { layout: { x: 0, y: 0, w: 6, h: 2 }, microApp: liftsApp },
  { layout: { x: 8, y: 0, w: 6, h: 2 }, microApp: robotMutexGroupsApp, hideToolbar: false },
];

const dashboarddWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 6, h: 1.4 }, microApp: robotsApp, hideToolbar: true },
  { layout: { x: 7, y: 0, w: 6, h: 1.4 }, microApp: activeTasksApp, hideToolbar: true },
  { layout: { x: 8, y: 0, w: 12, h: 4 }, microApp: mapL1App },
];

const fullTaskWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 12, h: 6 }, microApp: tasksApp },
];

function openMB1AMES() {
  window.location.href = 'rmf-mes-mb1a://launch';
}

function openLpierMES() {
  window.location.href = 'rmf-mes-lpier://launch';
}

const liftAlertDismissMs = 30_000;

function liftModeLabel(mode?: number): string {
  switch (mode) {
    case RmfLiftState.MODE_AGV:
      return 'AGV';
    case RmfLiftState.MODE_EMERGENCY:
      return 'Emergency';
    case RmfLiftState.MODE_FIRE:
      return 'Fire';
    case RmfLiftState.MODE_HUMAN:
      return 'Human';
    case RmfLiftState.MODE_OFFLINE:
      return 'Offline';
    default:
      return `Unknown (${mode})`;
  }
}

function LiftAgvModeOverlay() {
  const rmfApi = useRmfApi();
  const [liftNames, setLiftNames] = React.useState<string[]>([]);
  const [liftStates, setLiftStates] = React.useState<Record<string, LiftState>>({});
  const [dismissedUntil, setDismissedUntil] = React.useState<number | null>(null);

  React.useEffect(() => {
    const sub = rmfApi.buildingMapObs.subscribe((buildingMap) => {
      const names = buildingMap.lifts.map((lift) => lift.name);
      setLiftNames(names);
      setLiftStates((prev) => {
        const next: Record<string, LiftState> = {};
        for (const name of names) {
          if (prev[name]) {
            next[name] = prev[name];
          }
        }
        return next;
      });
    });

    return () => sub.unsubscribe();
  }, [rmfApi]);

  React.useEffect(() => {
    const subscriptions = liftNames.map((name) =>
      rmfApi.getLiftStateObs(name).subscribe((liftState) => {
        setLiftStates((prev) => ({ ...prev, [name]: liftState }));
      }),
    );

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [rmfApi, liftNames]);

  const nonAgvLifts = React.useMemo(
    () =>
      liftNames.flatMap((name) => {
        const liftState = liftStates[name];
        return liftState && liftState.current_mode !== RmfLiftState.MODE_AGV
          ? [{ name, liftState }]
          : [];
      }),
    [liftNames, liftStates],
  );

  React.useEffect(() => {
    if (nonAgvLifts.length === 0) {
      setDismissedUntil(null);
      return;
    }

    if (!dismissedUntil) {
      return;
    }

    const remainingMs = dismissedUntil - Date.now();
    if (remainingMs <= 0) {
      setDismissedUntil(null);
      return;
    }

    const timeout = window.setTimeout(() => setDismissedUntil(null), remainingMs);
    return () => window.clearTimeout(timeout);
  }, [dismissedUntil, nonAgvLifts.length]);

  const isDismissed = dismissedUntil !== null && dismissedUntil > Date.now();

  if (nonAgvLifts.length === 0 || isDismissed) {
    return null;
  }

  return (
    <Box
      aria-live="assertive"
      sx={{
        position: 'fixed',
        top: '40%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: 'calc(100% - 32px)', sm: 560 },
        zIndex: 1500,
        pointerEvents: 'none',
      }}
    >
      <Alert
        severity="warning"
        variant="filled"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => setDismissedUntil(Date.now() + liftAlertDismissMs)}
          >
            Dismiss
          </Button>
        }
        sx={{
          alignItems: 'flex-start',
          borderRadius: 1,
          boxShadow: 8,
          pointerEvents: 'auto',
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <Typography component="div" variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {nonAgvLifts.length === 1 ? 'Lift is not in AGV mode' : 'Lifts are not in AGV mode'}
        </Typography>
        <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 2.5 }}>
          {nonAgvLifts.map(({ name, liftState }) => (
            <Typography component="li" key={name} variant="body2" sx={{ lineHeight: 1.4 }}>
              {name}: {liftModeLabel(liftState.current_mode)}
              {liftState.current_floor ? `, floor ${liftState.current_floor}` : ''}
              {liftState.session_id ? `, session ${liftState.session_id}` : ''}
            </Typography>
          ))}
        </Box>
      </Alert>
    </Box>
  );
}

function SccPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LiftAgvModeOverlay />
    </>
  );
}

export default function App() {
  return (
    <RmfDashboard
      // apiServerUrl="http://localhost:8000"
      // trajectoryServerUrl="http://localhost:8006"
      apiServerUrl="http://10.160.55.13:8000"
      trajectoryServerUrl="http://10.160.55.13:8006"

      hideNewTaskButton={false}
      authenticator={new StubAuthenticator()}
      themes={{ default: createTheme(), dark: nordTheme }}
      resources={{ fleets: {}, logos: { header: '/resources/defaultLogo.png' } }}
      tasks={{
        allowedTasks: [{ taskDefinitionId: 'patrol' }, { taskDefinitionId: 'custom_compose' }],
        pickupZones: [],
        cartIds: [],
      }}
      tabs={[
        {
          name: 'MB1A Overview',
          route: 'mb1a-overview',
          tabGroup: 'mb1a',
          element: (
            <SccPage>
              <Box sx={{ position: 'relative', height: '90vh', width: '100%' }}>
                <Workspace initialWindows={overviewWorkspace} />
                <QuickDispatchButton
                  confirm
                  label="Transfer to LPier"
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '61%',
                    fontSize: 'clamp(32px,6vw, 96px)',
                  }}
                  taskRequest={{
                    category: 'patrol',
                    description: { places: ['MB1A-load', 'Lpier-Unload'] },
                    labels: ['task_definition_id=patrol', 'destination=Lpier-Unload'],
                    unix_millis_earliest_start_time: 0,
                    unix_millis_request_time: Date.now(),
                  }}
                />
              </Box>
              <Tooltip title="Open MES" placement="left">
                <Fab
                  color="primary"
                  onClick={openMB1AMES}
                  sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1300,
                    bgcolor: 'warning.main',
                  }}
                >
                  MES
                </Fab>
              </Tooltip>
            </SccPage>
          ),
        },

        {
          name: 'Task Map',
          route: 'task-map',
          tabGroup: 'taskMap',
          element: (
            <SccPage>
              <Workspace initialWindows={taskMapWorkspace} />
            </SccPage>
          ),
        },

        {
          name: 'Maps',
          route: 'mb1a-maps',
          tabGroup: 'mb1a',
          element: (
            <SccPage>
              <Workspace initialWindows={mapFullscreenWorkspace} />
            </SccPage>
          ),
        },

        {
          name: 'Admin',
          route: 'admin',
          tabGroup: 'admin',
          tabActions: (
            <>
              <QuickDispatchButton
                confirm
                label="Transfer to LPier"
                taskRequest={{
                  category: 'patrol',
                  description: { places: ['MB1A-load', 'Lpier-Unload'] },
                  labels: ['task_definition_id=patrol', 'destination=Lpier-Unload'],
                  unix_millis_earliest_start_time: 0,
                  unix_millis_request_time: Date.now(),
                }}
              />
              <span style={{ display: 'inline-block', width: '10px' }} />
              <QuickDispatchButton
                confirm
                label="Transfer to MB1A"
                taskRequest={{
                  category: 'patrol',
                  description: { places: ['Lpier-Load', 'MB1A-unload'] },
                  labels: ['task_definition_id=patrol', 'destination=MB1A-unload'],
                  unix_millis_earliest_start_time: 0,
                  unix_millis_request_time: Date.now(),
                }}
              />
            </>
          ),
          element: (
            <SccPage>
              <Workspace initialWindows={multipurposeWorkspace} />
            </SccPage>
          ),
        },

        {
          name: 'Dashboard',
          route: 'dashboard',
          tabGroup: 'dashboard',
          tabActions: (
            <>
              <QuickDispatchButton
                confirm
                label="Transfer to LPier"
                taskRequest={{
                  category: 'patrol',
                  description: { places: ['MB1A-load', 'Lpier-Unload'] },
                  labels: ['task_definition_id=patrol', 'destination=Lpier-Unload'],
                  unix_millis_earliest_start_time: 0,
                  unix_millis_request_time: Date.now(),
                }}
              />
              <span style={{ display: 'inline-block', width: '10px' }} />
              <QuickDispatchButton
                confirm
                label="Transfer to MB1A"
                taskRequest={{
                  category: 'patrol',
                  description: { places: ['Lpier-Load', 'MB1A-unload'] },
                  labels: ['task_definition_id=patrol', 'destination=MB1A-unload'],
                  unix_millis_earliest_start_time: 0,
                  unix_millis_request_time: Date.now(),
                }}
              />
            </>
          ),
          element: (
            <SccPage>
              <Workspace initialWindows={dashboarddWorkspace} />
            </SccPage>
          ),
        },

        {
          name: 'Task History',
          route: 'dashboard/task-history',
          tabGroup: 'dashboard',
          tabActions: (
            <>
              <QuickDispatchButton
                confirm
                label="Transfer to LPier"
                taskRequest={{
                  category: 'patrol',
                  description: { places: ['MB1A-load', 'Lpier-Unload'] },
                  labels: ['task_definition_id=patrol', 'destination=Lpier-Unload'],
                  unix_millis_earliest_start_time: 0,
                  unix_millis_request_time: Date.now(),
                }}
              />
              <span style={{ display: 'inline-block', width: '10px' }} />
              <QuickDispatchButton
                confirm
                label="Transfer to MB1A"
                taskRequest={{
                  category: 'patrol',
                  description: { places: ['Lpier-Load', 'MB1A-unload'] },
                  labels: ['task_definition_id=patrol', 'destination=MB1A-unload'],
                  unix_millis_earliest_start_time: 0,
                  unix_millis_request_time: Date.now(),
                }}
              />
            </>
          ),
          element: (
            <SccPage>
              <Workspace initialWindows={fullTaskWorkspace} />
            </SccPage>
          ),
        },

        // LPier group — only these tabs appear in the AppBar when on a /lpier* route
        {
          name: 'LPier Overview',
          route: 'lpier-overview',
          tabGroup: 'lpier',
          element: (
            <SccPage>
              <Box sx={{ position: 'relative', height: '90vh', width: '100%' }}>
                <Workspace initialWindows={overviewWorkspace} />
                <QuickDispatchButton
                  confirm
                  label="Transfer to MB1A"
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '61%',
                    fontSize: 'clamp(32px,6vw, 96px)',
                  }}
                  taskRequest={{
                    category: 'patrol',
                    description: { places: ['Lpier-wp27', 'Lpier-Load', 'MB1A-unload'] },
                    labels: ['task_definition_id=patrol', 'destination=MB1A-unload'],
                    unix_millis_earliest_start_time: 0,
                    unix_millis_request_time: Date.now(),
                  }}
                />
              </Box>
              <Tooltip title="Open MES" placement="left">
                <Fab
                  color="primary"
                  onClick={openLpierMES}
                  sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1300,
                    bgcolor: 'warning.main',
                  }}
                >
                  MES
                </Fab>
              </Tooltip>
            </SccPage>
          ),
        },

        {
          name: 'Maps',
          route: 'lpier-maps',
          tabGroup: 'lpier',
          element: (
            <SccPage>
              <Workspace initialWindows={mapFullscreenWorkspace} />
            </SccPage>
          ),
        },
      ]}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);

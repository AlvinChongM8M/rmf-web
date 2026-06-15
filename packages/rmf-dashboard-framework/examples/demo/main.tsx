import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { createTheme } from '@mui/material';
import ReactDOM from 'react-dom/client';
import {
  InitialWindow,
  // LocallyPersistentWorkspace,
  MicroAppManifest,
  QuickDispatchButton,
  RmfDashboard,
  Workspace,
} from 'rmf-dashboard-framework/components';
import {
  createMapApp,
  doorsApp,
  liftsApp,
  robotMutexGroupsApp,
  robotsApp,
  tasksApp,
  tasksCompactApp,
  createTasksCompactApp,
} from 'rmf-dashboard-framework/micro-apps';
import { StubAuthenticator } from 'rmf-dashboard-framework/services';

import { Box, Button, Fab, Tooltip } from '@mui/material';
import { clamp } from 'date-fns';
import { ViewWeek } from '@mui/icons-material';
import { red } from '@mui/material/colors';

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
  defaultZoom: 4,
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
  { layout: { x: 0, y: 0, w: 7, h: 8 }, microApp: tasksApp },
  { layout: { x: 8, y: 0, w: 5, h: 8 }, microApp: mapL1App },
  { layout: { x: 0, y: 0, w: 6, h: 4 }, microApp: liftsApp },
  { layout: { x: 8, y: 0, w: 6, h: 4 }, microApp: robotMutexGroupsApp, hideToolbar: false },
];

function openMB1AMES() {
  window.location.href = 'rmf-mes-mb1a://launch';
}

function openLpierMES() {
  window.location.href = 'rmf-mes-lpier://launch';
}

export default function App() {
  return (
    <RmfDashboard
      apiServerUrl="http://localhost:8000"
      trajectoryServerUrl="http://localhost:8006"
      // apiServerUrl="http://10.160.55.13:8000"
      // trajectoryServerUrl="http://10.160.55.13:8006"

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
            <>
            <Box sx={{ position: 'relative', height: '90vh', width: '100%' }}>
              <Workspace initialWindows={overviewWorkspace} />
              <QuickDispatchButton
                confirm
                label="Transfer to LPier"
                sx={{ position: 'relative', width: '100%', height: '61%', fontSize: 'clamp(32px,6vw, 96px)' }}
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
                sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300, bgcolor: 'warning.main' }}
              >
                MES
              </Fab>
            </Tooltip>
            </>
            
          ),
        },

        {
          name: 'Task Map',
          route: 'task-map',
          tabGroup: 'taskMap',
          element: <Workspace initialWindows={taskMapWorkspace} />
        },

        {
          name: 'Maps',
          route: 'mb1a-maps',
          tabGroup: 'mb1a',
          element: <Workspace initialWindows={mapFullscreenWorkspace} />,
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
          element: <Workspace initialWindows={multipurposeWorkspace} />,
        },

        // LPier group — only these tabs appear in the AppBar when on a /lpier* route
        {
          name: 'LPier Overview',
          route: 'lpier-overview',
          tabGroup: 'lpier',
          element: (
            <>
            <Box sx={{ position: 'relative', height: '90vh', width: '100%' }}>
              <Workspace initialWindows={overviewWorkspace} />
              <QuickDispatchButton
                confirm
                label="Transfer to MB1A"
                sx={{ position: 'relative', width: '100%', height: '61%', fontSize: 'clamp(32px,6vw, 96px)' }}
                taskRequest={{
                  category: 'patrol',
                  description: { places: ['Lpier-Load', 'MB1A-unload'] },
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
                sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300, bgcolor: 'warning.main' }}
              >
                MES
              </Fab>
            </Tooltip>
            </>

          ),
        },

        {
          name: 'Maps',
          route: 'lpier-maps',
          tabGroup: 'lpier',
          element: <Workspace initialWindows={mapFullscreenWorkspace} />,
        },
      ]}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);

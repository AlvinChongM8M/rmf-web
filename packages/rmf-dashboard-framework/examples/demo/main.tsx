import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { createTheme } from '@mui/material';
import ReactDOM from 'react-dom/client';
import {
  InitialWindow,
  LocallyPersistentWorkspace,
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
  defaultRobotZoom: 20,
  defaultZoom: 26,
  defaultHiddenLayers: [
    'Pickup & Dropoff labels',
    // 'Waypoint labels',   // leave this out to show waypoints by default
    'Doors labels',
    'Robots labels',
    'Trajectories',
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
    // 'Waypoint labels',  // leave this out to show waypoints by default
    'Doors labels',
    'Robots labels',
    'Trajectories',
    // 'Waypoints',         // leave this out to show waypoints by default
    // 'Robots',            // leave this out to show robots by default
  ],
});

const doneTasksApp = createTasksCompactApp({ statusFilter: 'cancelled,completed' });
const activeTasksApp = createTasksCompactApp({
  statusFilter: 'uninitialized,blocked,error,failed,queued,standby,underway,delayed,skipped,killed',
});

const appRegistry: MicroAppManifest[] = [
  mapL1App,
  mapL2App,
  doorsApp,
  liftsApp,
  robotsApp,
  robotMutexGroupsApp,
  tasksApp,
  tasksCompactApp,
  doneTasksApp,
  activeTasksApp,
];

const homeWorkspace: InitialWindow[] = [
  {
    layout: { x: 0, y: 0, w: 12, h: 6 },
    microApp: mapL1App,
  },
];

const robotsWorkspace: InitialWindow[] = [
  {
    layout: { x: 0, y: 0, w: 7, h: 4 },
    microApp: robotsApp,
  },
  { layout: { x: 8, y: 0, w: 5, h: 8 }, microApp: mapL1App },
  { layout: { x: 0, y: 0, w: 7, h: 4 }, microApp: doorsApp },
  { layout: { x: 0, y: 0, w: 7, h: 4 }, microApp: liftsApp },
  { layout: { x: 8, y: 0, w: 5, h: 4 }, microApp: robotMutexGroupsApp },
];

const tasksWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 7, h: 8 }, microApp: tasksApp },
  { layout: { x: 8, y: 0, w: 5, h: 8 }, microApp: mapL1App },
];

const overviewWorkspace: InitialWindow[] = [
  {
    layout: { x: 0, y: 0, w: 6, h: 2 },
    microApp: robotsApp,
  },
  { layout: { x: 7, y: 0, w: 6, h: 2 }, microApp: activeTasksApp, hideToolbar: false },
  { layout: { x: 0, y: 0, w: 12, h: 5 }, microApp: mapL1App, hideToolbar: true },
  // { layout: { x: 0, y: 0, w: 12, h: 2 }, microApp: liftsApp },
];

const mapWorkspace: InitialWindow[] = [
  { layout: { x: 0, y: 0, w: 12, h: 2.5 }, microApp: mapL1App, hideToolbar: true },
  { layout: { x: 0, y: 0, w: 12, h: 2.5 }, microApp: mapL2App, hideToolbar: true },
];

export default function App() {
  // const mapWorkspace: InitialWindow[] = [
  //   { layout: { x: 0, y: 0, w: 12, h: 2.5 }, microApp: mapL1App, hideToolbar: false },
  //   { layout: { x: 0, y: 0, w: 12, h: 2.5 }, microApp: mapL2App, hideToolbar: false },
  // ];

  return (
    <RmfDashboard
      apiServerUrl="http://localhost:8000"
      trajectoryServerUrl="http://localhost:8006"
      // apiServerUrl="http://10.10.10.2:8000"
      // trajectoryServerUrl="http://10.10.10.2:8006"
      hideNewTaskButton={false}
      authenticator={new StubAuthenticator()}
      themes={{ default: createTheme(), dark: nordTheme }}
      resources={{ fleets: {}, logos: { header: '/resources/defaultLogo.png' } }}
      tasks={{
        allowedTasks: [
          { taskDefinitionId: 'patrol' },
          { taskDefinitionId: 'delivery' },
          { taskDefinitionId: 'compose-clean' },
          { taskDefinitionId: 'custom_compose' },
        ],
        pickupZones: [],
        cartIds: [],
      }}
      tabs={[
        {
          // Arrival group — only these tabs appear in the AppBar when on an /arrival* route
          name: 'MB1A Overview',
          route: 'mb1a-overview',
          tabGroup: 'mb1a',
          tabActions: (
            <QuickDispatchButton
              label="Transfer to LPier"
              taskRequest={{
                category: 'patrol',
                description: { places: ['lounge', 'pantry'] },
                unix_millis_earliest_start_time: 0,
              }}
            />
          ),
          element: <Workspace initialWindows={overviewWorkspace} />,
        },
        // {
        {
          name: 'Maps',
          route: 'mb1a-maps',
          tabGroup: 'mb1a',
          tabActions: (
            <QuickDispatchButton
              label="Transfer to LPier"
              taskRequest={{
                category: 'patrol',
                description: { places: ['lounge', 'pantry'] },
                unix_millis_earliest_start_time: 0,
              }}
            />
          ),
          element: <Workspace initialWindows={mapWorkspace} />,
        },
        // Departure group — only these tabs appear in the AppBar when on a /departure* route
        {
          name: 'LPier Overview',
          route: 'lpier-overview',
          tabGroup: 'lpier',
          tabActions: (
            <QuickDispatchButton
              label="Transfer to MB1A"
              taskRequest={{
                category: 'patrol',
                description: { places: ['pantry', 'lounge'] },
                unix_millis_earliest_start_time: 0,
              }}
            />
          ),
          element: <Workspace initialWindows={overviewWorkspace} />,
        },
        {
          name: 'Maps',
          route: 'lpier-maps',
          tabGroup: 'lpier',
          tabActions: (
            <QuickDispatchButton
              label="Transfer to MB1A"
              taskRequest={{
                category: 'patrol',
                description: { places: ['pantry', 'lounge'] },
                unix_millis_earliest_start_time: 0,
              }}
            />
          ),
          element: <Workspace initialWindows={mapWorkspace} />,
        },
        //   name: 'Map',
        //   route: '',
        //   element: <Workspace initialWindows={homeWorkspace} />,
        // },
        // {
        //   name: 'Robots',
        //   route: 'robots',
        //   element: <Workspace initialWindows={robotsWorkspace} />,
        // },
        // {
        //   name: 'Tasks',
        //   route: 'tasks',
        //   element: <Workspace initialWindows={tasksWorkspace} />,
        // },
        // {
        //   name: 'Custom',
        //   route: 'custom',
        //   element: (
        //     <LocallyPersistentWorkspace
        //       defaultWindows={[]}
        //       allowDesignMode
        //       appRegistry={appRegistry}
        //       storageKey="custom-workspace"
        //     />
        //   ),
        // },
      ]}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);

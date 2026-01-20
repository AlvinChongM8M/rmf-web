import { lazy } from 'react';
import { Suspense } from 'react';

import { MicroAppManifest } from '../components';

const TasksWindowCompact = lazy(() => import('../components/tasks/tasks-window-compact'));

export default {
  appId: 'tasks-compact',
  displayName: 'Tasks Compact',
  Component: (props) => (
    <Suspense fallback={null}>
      <TasksWindowCompact {...props} />
    </Suspense>
  ),
} satisfies MicroAppManifest;

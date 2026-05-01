import { lazy, Suspense } from 'react';

import { MicroAppManifest } from '../components';
import type { TasksWindowCompactProps } from '../components/tasks/tasks-window-compact';

const TasksWindowCompact = lazy(() => import('../components/tasks/tasks-window-compact'));

export interface TasksCompactAppConfig {
  /**
   * Comma-separated list of task statuses to pre-filter by (e.g. "cancelled,completed").
   * The user can still override this by applying their own filter in the table.
   */
  statusFilter?: string;
}

/**
 * Creates a Tasks Compact micro-app with optional pre-configured filters.
 *
 * @example
 * // Show only cancelled and completed tasks by default
 * const doneTasksApp = createTasksCompactApp({ statusFilter: 'cancelled,completed' });
 */
export function createTasksCompactApp(config: TasksCompactAppConfig = {}): MicroAppManifest {
  return {
    appId: 'tasks-compact',
    displayName: 'Tasks Compact',
    Component: (props: TasksWindowCompactProps) => (
      <Suspense fallback={null}>
        <TasksWindowCompact {...props} statusFilter={config.statusFilter} />
      </Suspense>
    ),
  };
}

/**
 * Default Tasks Compact app with no pre-configured filters.
 */
export default createTasksCompactApp();

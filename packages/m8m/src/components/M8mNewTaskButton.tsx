import { Alert, Button, Snackbar } from '@mui/material';
import type { TaskFavorite } from 'api-client';
import React from 'react';

import { LocalizationProvider } from 'rmf-dashboard-framework/components/locale';
import {
  dispatchTask,
  scheduleTask,
  TaskForm,
  type TaskFormProps,
} from 'rmf-dashboard-framework/components/tasks';
import { useRmfApi, useTaskFormData } from 'rmf-dashboard-framework/hooks';

export interface M8mNewTaskButtonProps {
  /** Username recorded as the task requester. */
  username: string;
  /** Text displayed on the floating button. */
  label?: string;
  /** DOM ID used by tests or project-specific styling. */
  buttonId?: string;
  /** Optional project-specific list of task definitions. */
  tasksToDisplay?: TaskFormProps['tasksToDisplay'];
  /** Optional pickup zones used by custom delivery tasks. */
  pickupZones?: string[];
  /** Optional cart IDs used by custom delivery tasks. */
  cartIds?: string[];
  /** Whether the task form should offer scheduling. */
  allowScheduling?: boolean;
}

interface Feedback {
  severity: 'success' | 'error';
  message: string;
}

/**
 * Shared M8M trigger for the RMF dashboard framework's task form.
 * Must be rendered inside the framework RMF API context providers.
 */
export function M8mNewTaskButton({
  username,
  label = 'New Task',
  buttonId = 'm8m-new-task-button',
  tasksToDisplay,
  pickupZones,
  cartIds,
  allowScheduling = true,
}: M8mNewTaskButtonProps): JSX.Element {
  const rmfApi = useRmfApi();
  const { waypointNames, pickupPoints, dropoffPoints, cleaningZoneNames, fleets } =
    useTaskFormData(rmfApi);
  const [open, setOpen] = React.useState(false);
  const [favoriteTasks, setFavoriteTasks] = React.useState<TaskFavorite[]>([]);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);

  const refreshFavoriteTasks = React.useCallback(async () => {
    try {
      const response = await rmfApi.tasksApi.getFavoritesTasksFavoriteTasksGet();
      setFavoriteTasks(response.data as TaskFavorite[]);
    } catch (error) {
      console.error('Failed to load favorite tasks:', error);
      setFeedback({ severity: 'error', message: 'Failed to load favorite tasks' });
    }
  }, [rmfApi]);

  React.useEffect(() => {
    void refreshFavoriteTasks();
  }, [refreshFavoriteTasks]);

  const handleDispatchTask = React.useCallback<Required<TaskFormProps>['onDispatchTask']>(
    async (taskRequest, robotDispatchTarget) => {
      await dispatchTask(rmfApi, taskRequest, robotDispatchTarget);
    },
    [rmfApi],
  );

  const handleScheduleTask = React.useCallback<Required<TaskFormProps>['onScheduleTask']>(
    async (taskRequest, schedule) => {
      await scheduleTask(rmfApi, taskRequest, schedule);
    },
    [rmfApi],
  );

  const handleSaveFavorite = React.useCallback<Required<TaskFormProps>['submitFavoriteTask']>(
    async (favoriteTask) => {
      await rmfApi.tasksApi.postFavoriteTaskFavoriteTasksPost(favoriteTask);
      await refreshFavoriteTasks();
    },
    [refreshFavoriteTasks, rmfApi],
  );

  const handleDeleteFavorite = React.useCallback<Required<TaskFormProps>['deleteFavoriteTask']>(
    async (favoriteTask) => {
      if (!favoriteTask.id) {
        throw new Error('Favorite task ID is required');
      }
      await rmfApi.tasksApi.deleteFavoriteTaskFavoriteTasksFavoriteTaskIdDelete(favoriteTask.id);
      await refreshFavoriteTasks();
    },
    [refreshFavoriteTasks, rmfApi],
  );

  return (
    <>
      <Button
        id={buttonId}
        aria-label="new task"
        color="primary"
        variant="contained"
        onClick={() => setOpen(true)}
        sx={{
          minWidth: '8rem',
          borderRadius: '999px',
          boxShadow: 6,
          fontSize: '0.9rem',
          fontWeight: 700,
        }}
      >
        {label}
      </Button>

      <LocalizationProvider>
        {open && (
          <TaskForm
            user={username}
            fleets={fleets}
            tasksToDisplay={tasksToDisplay}
            patrolWaypoints={waypointNames}
            cleaningZones={cleaningZoneNames}
            pickupZones={pickupZones}
            cartIds={cartIds}
            pickupPoints={pickupPoints}
            dropoffPoints={dropoffPoints}
            favoritesTasks={favoriteTasks}
            open={open}
            onClose={() => setOpen(false)}
            onDispatchTask={handleDispatchTask}
            onScheduleTask={allowScheduling ? handleScheduleTask : undefined}
            submitFavoriteTask={handleSaveFavorite}
            deleteFavoriteTask={handleDeleteFavorite}
            onSuccess={() => {
              setOpen(false);
              setFeedback({ severity: 'success', message: 'Dispatch task requested' });
            }}
            onFail={(error) => {
              console.error('Failed to dispatch task:', error);
              setFeedback({
                severity: 'error',
                message: `Failed to dispatch task: ${error.message}`,
              });
            }}
            onSuccessScheduling={() => {
              setOpen(false);
              setFeedback({ severity: 'success', message: 'Schedule task requested' });
            }}
            onFailScheduling={(error) => {
              console.error('Failed to schedule task:', error);
              setFeedback({
                severity: 'error',
                message: `Failed to schedule task: ${error.message}`,
              });
            }}
            onSuccessFavoriteTask={(message) => {
              setFeedback({ severity: 'success', message });
            }}
            onFailFavoriteTask={(error) => {
              console.error('Failed to update favorite task:', error);
              setFeedback({ severity: 'error', message: `Favorite task failed: ${error.message}` });
            }}
          />
        )}
      </LocalizationProvider>

      <Snackbar
        open={feedback !== null}
        autoHideDuration={5000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={feedback?.severity ?? 'success'} onClose={() => setFeedback(null)}>
          {feedback?.message}
        </Alert>
      </Snackbar>
    </>
  );
}

import React from 'react';
import {
  ApiServerModelsRmfApiTaskStateStatus as Status,
  TaskStateInput as TaskState,
} from 'api-client';
import { parseTaskBookingLabels, TaskCancelButton } from 'rmf-dashboard-framework/components/tasks';
import { useRmfApi } from 'rmf-dashboard-framework/hooks';
import '../styles/AtasTaskPage.css';

interface TaskTableData {
  taskId: string;
  taskType: string;
  startLocation: string;
  endLocation: string;
  amrId: string;
  startTime: string;
  startTimeMs?: number;
  endTime: string;
  endTimeMs?: number;
  taskDurationSec: number;
  taskStatus: Status | undefined;
}

type TaskSortKey =
  | 'taskId'
  | 'taskType'
  | 'startLocation'
  | 'endLocation'
  | 'amrId'
  | 'startTime'
  | 'endTime'
  | 'taskDurationSec'
  | 'taskStatus';

interface TaskSort {
  key: TaskSortKey;
  direction: 'asc' | 'desc';
}

const taskCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const PLACE_TAG_PATTERN = /\[place:(.*?)\]/g;

interface TaskPhaseLocationSource {
  detail?: unknown;
  events?: Record<string, { detail?: unknown; name?: unknown }> | null;
}

function taskSortValue(task: TaskTableData, key: TaskSortKey): string | number | null {
  switch (key) {
    case 'taskId':
      return task.taskId;
    case 'taskType':
      return task.taskType;
    case 'startLocation':
      return task.startLocation;
    case 'endLocation':
      return task.endLocation;
    case 'amrId':
      return task.amrId;
    case 'startTime':
      return task.startTimeMs ?? null;
    case 'endTime':
      return task.endTimeMs ?? null;
    case 'taskDurationSec':
      return task.taskDurationSec;
    case 'taskStatus':
      return task.taskStatus ?? null;
  }
}

function compareTasks(left: TaskTableData, right: TaskTableData, sort: TaskSort): number {
  const leftValue = taskSortValue(left, sort.key);
  const rightValue = taskSortValue(right, sort.key);

  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;

  const comparison =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : taskCollator.compare(String(leftValue), String(rightValue));
  return comparison * (sort.direction === 'asc' ? 1 : -1);
}

function locationOrFallback(location?: string | null): string {
  const trimmedLocation = location?.trim();
  return trimmedLocation || '-';
}

function placeFromText(value: unknown, preferLast = false): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const matches = [...value.matchAll(PLACE_TAG_PATTERN)]
    .map((match) => match[1]?.trim())
    .filter((place): place is string => Boolean(place));

  if (matches.length === 0) {
    return undefined;
  }

  return preferLast ? matches[matches.length - 1] : matches[0];
}

function locationFromDetail(detail: unknown, preferLast = false): string | undefined {
  if (!detail) {
    return undefined;
  }

  const textPlace = placeFromText(detail, preferLast);
  if (textPlace) {
    return textPlace;
  }

  if (typeof detail === 'object' && 'location' in detail) {
    const location = (detail as { location?: unknown }).location;
    if (typeof location === 'string' && location.trim()) {
      return location.trim();
    }
  }

  return undefined;
}

function locationFromPhase(phase: TaskPhaseLocationSource | undefined, preferLast = false) {
  const detailLocation = locationFromDetail(phase?.detail, preferLast);
  if (detailLocation) {
    return detailLocation;
  }

  const events = Object.values(phase?.events ?? {});
  const orderedEvents = preferLast ? [...events].reverse() : events;
  for (const event of orderedEvents) {
    const eventLocation =
      locationFromDetail(event.detail, preferLast) ?? placeFromText(event.name, preferLast);
    if (eventLocation) {
      return eventLocation;
    }
  }

  return undefined;
}

function parseLocations(task: TaskState): { startLocation: string; endLocation: string } {
  const labels = task.booking?.labels ? parseTaskBookingLabels(task.booking.labels) : {};
  const phases = task.phases as Record<string, TaskPhaseLocationSource> | undefined;
  const phaseEntries = Object.values(phases ?? {});
  const firstPhase = phaseEntries[0];
  const lastPhase = phaseEntries[phaseEntries.length - 1];

  const startLocation =
    labels.pickup ?? labels.start ?? labels.origin ?? locationFromPhase(firstPhase);
  const endLocation =
    labels.destination ?? labels.dropoff ?? labels.end ?? locationFromPhase(lastPhase, true);

  return {
    startLocation: locationOrFallback(startLocation),
    endLocation: locationOrFallback(endLocation),
  };
}

export function AtasTaskPage(): JSX.Element {
  const rmfApi = useRmfApi();
  const [tasks, setTasks] = React.useState<TaskTableData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sort, setSort] = React.useState<TaskSort>({ key: 'startTime', direction: 'desc' });

  React.useEffect(() => {
    let mounted = true;

    const refreshTasks = async () => {
      try {
        const response = await rmfApi.tasksApi.queryTaskStatesTasksGet(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1000,
          0,
          '-unix_millis_start_time',
          undefined,
        );
        const taskData = response.data || [];
        const tableData: TaskTableData[] = taskData.map((task: TaskState) => {
          const { startLocation, endLocation } = parseLocations(task);
          const startTimeMs = task.unix_millis_start_time || 0;
          const endTimeMs = task.unix_millis_finish_time || 0;
          const durationSec =
            endTimeMs > 0 && startTimeMs > 0 ? Math.round((endTimeMs - startTimeMs) / 1000) : 0;

          return {
            taskId: task.booking?.id || '-',
            taskType: task.category || '-',
            startLocation,
            endLocation,
            amrId: task.assigned_to?.name || '-',
            startTime: startTimeMs ? new Date(startTimeMs).toLocaleString() : '-',
            startTimeMs: startTimeMs || undefined,
            endTime: endTimeMs ? new Date(endTimeMs).toLocaleString() : '-',
            endTimeMs: endTimeMs || undefined,
            taskDurationSec: durationSec,
            taskStatus: task.status ?? undefined,
          };
        });

        if (mounted) {
          setTasks(tableData);
        }
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void refreshTasks();
    const intervalId = window.setInterval(() => {
      void refreshTasks();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [rmfApi]);

  const getStatusClass = (status?: Status) => {
    switch (status) {
      case Status.Underway:
        return 'atas-task-status--underway';
      case Status.Completed:
        return 'atas-task-status--completed';
      case Status.Canceled:
        return 'atas-task-status--canceled';
      case Status.Failed:
        return 'atas-task-status--failed';
      case Status.Queued:
        return 'atas-task-status--queued';
      default:
        return 'atas-task-status--unknown';
    }
  };

  const sortedTasks = React.useMemo(
    () =>
      tasks
        .map((task, index) => ({ task, index }))
        .sort((left, right) => {
          const comparison = compareTasks(left.task, right.task, sort);
          return comparison === 0 ? left.index - right.index : comparison;
        })
        .map(({ task }) => task),
    [sort, tasks],
  );

  const handleSort = (key: TaskSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortHeader = (label: string, key: TaskSortKey) => {
    const isActive = sort.key === key;
    const ariaSort = isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
    return (
      <th aria-sort={ariaSort}>
        <button
          className="atas-task-sort-button"
          type="button"
          onClick={() => handleSort(key)}
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <span className="atas-task-sort-indicator" aria-hidden="true">
            {isActive ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="atas-task-page">
      <div className="atas-task-header">
        {/* <h2>Task Management</h2> */}
        <p className="atas-task-count">Total Tasks: {tasks.length}</p>
      </div>

      <div className="atas-task-table-container">
        {isLoading ? (
          <div className="atas-task-loading">Loading tasks...</div>
        ) : (
          <table className="atas-task-table">
            <thead>
              <tr>
                {sortHeader('Task ID', 'taskId')}
                {sortHeader('Task Type', 'taskType')}
                {sortHeader('Start Location', 'startLocation')}
                {sortHeader('End Location', 'endLocation')}
                {sortHeader('AMR ID', 'amrId')}
                {sortHeader('Start Time', 'startTime')}
                {sortHeader('End Time', 'endTime')}
                {sortHeader('Duration (s)', 'taskDurationSec')}
                {sortHeader('Status', 'taskStatus')}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="atas-task-empty">
                    No tasks available
                  </td>
                </tr>
              ) : (
                sortedTasks.map((task) => (
                  <tr
                    key={`${task.taskId}-${task.startTimeMs ?? 'pending'}`}
                    className="atas-task-row"
                  >
                    <td className="atas-task-id">{task.taskId}</td>
                    <td>{task.taskType}</td>
                    <td>{task.startLocation}</td>
                    <td>{task.endLocation}</td>
                    <td className="atas-task-amr">{task.amrId}</td>
                    <td className="atas-task-time">{task.startTime}</td>
                    <td className="atas-task-time">{task.endTime}</td>
                    <td className="atas-task-duration">{task.taskDurationSec}</td>
                    <td>
                      <span className={`atas-task-status ${getStatusClass(task.taskStatus)}`}>
                        {task.taskStatus || 'Unknown'}
                      </span>
                    </td>
                    <td className="atas-task-actions">
                      <div
                        className="atas-task-actions__buttons"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <TaskCancelButton
                          taskId={task.taskId === '-' ? null : task.taskId}
                          buttonText="Cancel Task"
                          size="small"
                          variant="contained"
                          color="error"
                          sx={{
                            minWidth: '6.5rem',
                            px: 1,
                            py: 0.35,
                            fontSize: '0.7rem',
                            textTransform: 'none',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

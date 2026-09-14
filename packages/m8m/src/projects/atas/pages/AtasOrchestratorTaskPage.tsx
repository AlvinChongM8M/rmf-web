import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import React from 'react';
import '../styles/AtasOrchestratorTaskPage.css';

interface OrchestratorTask {
  id: string;
  task_number?: number;
  display_id?: string;
  status: string;
  priority: number;
  started_at: string | null;
  finished_at: string | null;
  source_tss_name: string;
  source_tus_name: string;
  source_nickname: string | null;
  source_waypoint_name: string;
  destination_tss_name: string;
  destination_tus_name: string;
  destination_nickname: string | null;
  destination_waypoint_name: string;
  assigned_robot_name?: string | null;
  cancel_requested: boolean;
}

interface OrchestratorTaskResponse {
  total: number;
  items: OrchestratorTask[];
}

interface AtasOrchestratorTaskPageProps {
  serverUrl: string;
  refreshIntervalMs?: number;
  recordLimit?: number;
}

type TaskSortKey =
  | 'taskId'
  | 'source'
  | 'destination'
  | 'startTime'
  | 'endTime'
  | 'duration'
  | 'amrId'
  | 'priority'
  | 'status';

interface TaskSort {
  key: TaskSortKey;
  direction: 'asc' | 'desc';
}

const taskCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function displayText(value: string | null | undefined): string {
  return value?.trim() || '-';
}

function tusDisplayLabel(
  nickname: string | null,
  tssName: string,
  tusName: string,
): string {
  return `${displayText(nickname)} (${tssName} / ${tusName})`;
}

function sourceLabel(task: OrchestratorTask): string {
  return tusDisplayLabel(task.source_nickname, task.source_tss_name, task.source_tus_name);
}

function destinationLabel(task: OrchestratorTask): string {
  return tusDisplayLabel(
    task.destination_nickname,
    task.destination_tss_name,
    task.destination_tus_name,
  );
}

function taskDisplayId(task: OrchestratorTask): string {
  if (task.display_id?.trim()) {
    return task.display_id;
  }
  if (task.task_number != null) {
    return `ATAS-${String(task.task_number).padStart(6, '0')}`;
  }
  return task.id;
}

function dateTimeValue(value: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function taskDurationMs(task: OrchestratorTask): number | null {
  const start = dateTimeValue(task.started_at);
  const end = dateTimeValue(task.finished_at);
  return start == null || end == null ? null : end - start;
}

function formatDuration(value: number | null): string {
  if (value == null) return '-';
  const sign = value < 0 ? '-' : '';
  let remaining = Math.abs(value);
  const days = Math.floor(remaining / 86_400_000);
  remaining %= 86_400_000;
  const hours = Math.floor(remaining / 3_600_000);
  remaining %= 3_600_000;
  const minutes = Math.floor(remaining / 60_000);
  remaining %= 60_000;
  const seconds = Math.floor(remaining / 1000);
  const milliseconds = remaining % 1000;
  const pad = (part: number, length = 2) => String(part).padStart(length, '0');
  return `${sign}${pad(days, 3)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(
    milliseconds,
    3,
  )}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${formatted}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function taskSortValue(task: OrchestratorTask, key: TaskSortKey): string | number | null {
  switch (key) {
    case 'taskId':
      return task.task_number ?? taskDisplayId(task);
    case 'source':
      return sourceLabel(task);
    case 'destination':
      return destinationLabel(task);
    case 'startTime':
      return dateTimeValue(task.started_at);
    case 'endTime':
      return dateTimeValue(task.finished_at);
    case 'duration':
      return taskDurationMs(task);
    case 'amrId':
      return task.assigned_robot_name ?? null;
    case 'priority':
      return task.priority;
    case 'status':
      return task.status;
  }
}

const TERMINAL_TASK_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'FAILED']);

function isTaskCancellable(task: OrchestratorTask): boolean {
  return (
    !TERMINAL_TASK_STATUSES.has(task.status.toUpperCase()) &&
    task.status.toUpperCase() !== 'CANCEL_REQUESTED' &&
    !task.cancel_requested
  );
}

function compareTasks(left: OrchestratorTask, right: OrchestratorTask, sort: TaskSort): number {
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

function statusClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'ASSIGNED':
    case 'EXECUTING':
      return 'atas-orchestrator-task-status--active';
    case 'COMPLETED':
      return 'atas-orchestrator-task-status--completed';
    case 'FAILED':
    case 'RECOVERY_REQUIRED':
    case 'SUBMISSION_UNKNOWN':
      return 'atas-orchestrator-task-status--error';
    case 'CANCELLED':
      return 'atas-orchestrator-task-status--cancelled';
    case 'CANCEL_REQUESTED':
      return 'atas-orchestrator-task-status--warning';
    case 'QUEUED':
    case 'RESERVING':
    case 'SUBMITTING':
    case 'RMF_PENDING':
      return 'atas-orchestrator-task-status--pending';
    default:
      return 'atas-orchestrator-task-status--unknown';
  }
}

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as {
      detail?: string | Array<{ msg?: string }>;
    };
    const detail = Array.isArray(body.detail)
      ? body.detail.map((item) => item.msg).filter(Boolean).join('; ')
      : body.detail;
    if (detail) return new Error(detail);
  } catch {
    // Fall back to the HTTP status when the response is not JSON.
  }
  return new Error(`Request failed (${response.status} ${response.statusText})`);
}

export function AtasOrchestratorTaskPage({
  serverUrl,
  refreshIntervalMs = 5000,
  recordLimit = 1000,
}: AtasOrchestratorTaskPageProps): JSX.Element {
  const normalizedServerUrl = React.useMemo(() => serverUrl.replace(/\/$/, ''), [serverUrl]);
  const [tasks, setTasks] = React.useState<OrchestratorTask[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<TaskSort>({
    key: 'startTime',
    direction: 'desc',
  });
  const [selectedCancelTask, setSelectedCancelTask] =
    React.useState<OrchestratorTask | null>(null);
  const [cancellationRemark, setCancellationRemark] = React.useState('');
  const [cancellationError, setCancellationError] = React.useState<string | null>(null);
  const [cancellationSubmitting, setCancellationSubmitting] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();

    const refreshTasks = async () => {
      try {
        const params = new URLSearchParams({
          limit: String(Math.min(1000, Math.max(1, recordLimit))),
          offset: '0',
        });
        const response = await fetch(`${normalizedServerUrl}/api/v1/tasks?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw await responseError(response);
        const data = (await response.json()) as OrchestratorTaskResponse;
        if (!Array.isArray(data.items)) {
          throw new Error('Task orchestrator returned an invalid task list.');
        }
        setTasks(data.items);
        setTotal(typeof data.total === 'number' ? data.total : data.items.length);
        setError(null);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          console.error('Failed to load orchestrator tasks:', fetchError);
          setError((fetchError as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void refreshTasks();
    const intervalId = window.setInterval(() => void refreshTasks(), refreshIntervalMs);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [normalizedServerUrl, recordLimit, refreshIntervalMs]);

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

  const openCancellationDialog = (task: OrchestratorTask) => {
    setSelectedCancelTask(task);
    setCancellationRemark('');
    setCancellationError(null);
  };

  const closeCancellationDialog = () => {
    if (cancellationSubmitting) return;
    setSelectedCancelTask(null);
    setCancellationRemark('');
    setCancellationError(null);
  };

  const cancelTask = async () => {
    if (!selectedCancelTask || cancellationSubmitting) return;
    const remark = cancellationRemark.trim();
    if (!remark) {
      setCancellationError('Cancellation remark is required.');
      return;
    }

    setCancellationSubmitting(true);
    setCancellationError(null);
    try {
      const response = await fetch(
        `${normalizedServerUrl}/api/v1/tasks/${encodeURIComponent(selectedCancelTask.id)}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remark }),
        },
      );
      if (!response.ok) throw await responseError(response);
      const updatedTask = (await response.json()) as OrchestratorTask;
      setTasks((current) =>
        current.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
      );
      setSelectedCancelTask(null);
      setCancellationRemark('');
    } catch (cancelError) {
      console.error('Failed to cancel orchestrator task:', cancelError);
      setCancellationError((cancelError as Error).message);
    } finally {
      setCancellationSubmitting(false);
    }
  };

  const sortHeader = (label: string, key: TaskSortKey) => {
    const active = sort.key === key;
    return (
      <th aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button
          className="atas-orchestrator-task-sort-button"
          type="button"
          onClick={() => handleSort(key)}
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <span className="atas-orchestrator-task-sort-indicator" aria-hidden="true">
            {active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <>
      <section className="atas-orchestrator-task-page" aria-label="Orchestrator task monitoring">
        <div className="atas-orchestrator-task-summary">
          <span>Total Tasks: {total}</span>
          {total > tasks.length && <span>Showing newest {tasks.length}</span>}
        </div>
        {error && <div className="atas-orchestrator-task-error">{error}</div>}
        <div className="atas-orchestrator-task-table-wrapper">
          {loading ? (
            <div className="atas-orchestrator-task-message">Loading orchestrator tasks…</div>
          ) : (
            <table className="atas-orchestrator-task-table">
              <thead>
                <tr>
                  {sortHeader('Task ID', 'taskId')}
                  {sortHeader('Source', 'source')}
                  {sortHeader('Destination', 'destination')}
                  {sortHeader('Start Time', 'startTime')}
                  {sortHeader('End Time', 'endTime')}
                  {sortHeader('Duration', 'duration')}
                  {sortHeader('AMR ID', 'amrId')}
                  {sortHeader('Priority', 'priority')}
                  {sortHeader('Status', 'status')}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td className="atas-orchestrator-task-empty" colSpan={10}>
                      No orchestrator tasks available
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => {
                    const source = sourceLabel(task);
                    const destination = destinationLabel(task);
                    const cancellable = isTaskCancellable(task);
                    return (
                      <tr key={task.id}>
                        <td className="atas-orchestrator-task-id" title={task.id}>
                          {taskDisplayId(task)}
                        </td>
                        <td title={`${source} · ${task.source_waypoint_name}`}>
                          <span className="atas-orchestrator-task-node">{source}</span>
                          <span className="atas-orchestrator-task-waypoint">
                            {task.source_waypoint_name}
                          </span>
                        </td>
                        <td title={`${destination} · ${task.destination_waypoint_name}`}>
                          <span className="atas-orchestrator-task-node">{destination}</span>
                          <span className="atas-orchestrator-task-waypoint">
                            {task.destination_waypoint_name}
                          </span>
                        </td>
                        <td className="atas-orchestrator-task-time">
                          {formatDateTime(task.started_at)}
                        </td>
                        <td className="atas-orchestrator-task-time">
                          {formatDateTime(task.finished_at)}
                        </td>
                        <td className="atas-orchestrator-task-duration">
                          {formatDuration(taskDurationMs(task))}
                        </td>
                        <td className="atas-orchestrator-task-amr">
                          {displayText(task.assigned_robot_name)}
                        </td>
                        <td>{task.priority}</td>
                        <td>
                          <span
                            className={`atas-orchestrator-task-status ${statusClass(task.status)}`}
                          >
                            {displayText(task.status)}
                          </span>
                        </td>
                        <td className="atas-orchestrator-task-actions">
                          <button
                            className="atas-orchestrator-task-cancel-button"
                            type="button"
                            disabled={!cancellable}
                            title={
                              cancellable
                                ? `Cancel ${taskDisplayId(task)}`
                                : `${taskDisplayId(task)} cannot be cancelled in its current state`
                            }
                            onClick={() => openCancellationDialog(task)}
                          >
                            Cancel Task
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <Dialog
        open={selectedCancelTask !== null}
        onClose={closeCancellationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Cancel Task {selectedCancelTask ? taskDisplayId(selectedCancelTask) : ''}
        </DialogTitle>
        <DialogContent dividers>
          {cancellationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cancellationError}
            </Alert>
          )}
          <DialogContentText sx={{ mb: 2 }}>
            Confirm that you want to request cancellation of this orchestrator task.
          </DialogContentText>
          <TextField
            autoFocus
            required
            fullWidth
            multiline
            minRows={2}
            label="Cancellation Remark"
            value={cancellationRemark}
            disabled={cancellationSubmitting}
            inputProps={{ maxLength: 2000 }}
            onChange={(event) => setCancellationRemark(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            disabled={cancellationSubmitting}
            onClick={closeCancellationDialog}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={cancellationSubmitting || !cancellationRemark.trim()}
            onClick={() => void cancelTask()}
          >
            {cancellationSubmitting ? 'Submitting…' : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

import React from 'react';
import '../styles/AtasOrchestratorTaskPage.css';

interface OrchestratorTask {
  id: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  created_by: string;
  creation_method: string;
  source_tss_name: string;
  source_tus_name: string;
  source_nickname: string | null;
  source_waypoint_name: string;
  destination_tss_name: string;
  destination_tus_name: string;
  destination_nickname: string | null;
  destination_waypoint_name: string;
  reason_code: string | null;
  hold_reason: string | null;
  remark: string | null;
  rmf_task_id: string | null;
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
  | 'createdAt'
  | 'taskId'
  | 'source'
  | 'destination'
  | 'priority'
  | 'creationMethod'
  | 'rmfTaskId'
  | 'status'
  | 'updatedAt'
  | 'reason';

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

function taskReason(task: OrchestratorTask): string {
  return task.reason_code ?? task.hold_reason ?? task.remark ?? '-';
}

function dateTimeValue(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
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
    case 'createdAt':
      return dateTimeValue(task.created_at);
    case 'taskId':
      return task.id;
    case 'source':
      return sourceLabel(task);
    case 'destination':
      return destinationLabel(task);
    case 'priority':
      return task.priority;
    case 'creationMethod':
      return task.creation_method;
    case 'rmfTaskId':
      return task.rmf_task_id;
    case 'status':
      return task.status;
    case 'updatedAt':
      return dateTimeValue(task.updated_at);
    case 'reason':
      return taskReason(task);
  }
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
    const body = (await response.json()) as { detail?: string };
    if (body.detail) return new Error(body.detail);
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
    key: 'createdAt',
    direction: 'desc',
  });

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
                {sortHeader('Created At', 'createdAt')}
                {sortHeader('Task ID', 'taskId')}
                {sortHeader('Source', 'source')}
                {sortHeader('Destination', 'destination')}
                {sortHeader('Priority', 'priority')}
                {sortHeader('Method', 'creationMethod')}
                {sortHeader('RMF Task ID', 'rmfTaskId')}
                {sortHeader('Status', 'status')}
                {sortHeader('Updated At', 'updatedAt')}
                {sortHeader('Reason', 'reason')}
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
                  const reason = taskReason(task);
                  return (
                    <tr key={task.id}>
                      <td className="atas-orchestrator-task-time">
                        {formatDateTime(task.created_at)}
                      </td>
                      <td className="atas-orchestrator-task-id" title={task.id}>
                        {task.id}
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
                      <td>{task.priority}</td>
                      <td>{displayText(task.creation_method)}</td>
                      <td className="atas-orchestrator-task-id" title={task.rmf_task_id ?? ''}>
                        {displayText(task.rmf_task_id)}
                      </td>
                      <td>
                        <span
                          className={`atas-orchestrator-task-status ${statusClass(task.status)}`}
                        >
                          {displayText(task.status)}
                        </span>
                      </td>
                      <td className="atas-orchestrator-task-time">
                        {formatDateTime(task.updated_at)}
                      </td>
                      <td title={reason}>{reason}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

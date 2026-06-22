import React from 'react';
import {
  ApiServerModelsRmfApiTaskStateStatus as Status,
  TaskStateInput as TaskState,
} from 'api-client';
import { useRmfApi } from 'rmf-dashboard-framework/hooks';
import '../styles/AtasTaskPage.css';

interface TaskTableData {
  taskId: string;
  taskType: string;
  startLocation: string;
  endLocation: string;
  amrId: string;
  startTime: string;
  endTime: string;
  taskDurationSec: number;
  taskStatus: Status | undefined;
}

export function AtasTaskPage(): JSX.Element {
  const rmfApi = useRmfApi();
  const [tasks, setTasks] = React.useState<TaskTableData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const parseLocations = (task: TaskState): { startLocation: string; endLocation: string } => {
      let startLocation = '-';
      let endLocation = '-';
      const phases = task.phases as Record<string, { detail?: unknown }> | undefined;
      if (!phases) {
        return { startLocation, endLocation };
      }
      const phaseEntries = Object.values(phases);
      if (phaseEntries.length === 0) {
        return { startLocation, endLocation };
      }

      const firstPhaseDetail = String(phaseEntries[0]?.detail ?? '');
      const lastPhaseDetail = String(phaseEntries[phaseEntries.length - 1]?.detail ?? '');
      const startMatch = firstPhaseDetail.match(/\[place:(.*?)\]/);
      if (startMatch) {
        startLocation = startMatch[1];
      }
      const endMatch = lastPhaseDetail.match(/\[place:(.*?)\]/);
      if (endMatch) {
        endLocation = endMatch[1];
      }
      return { startLocation, endLocation };
    };

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
          100,
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
            endTime: endTimeMs ? new Date(endTimeMs).toLocaleString() : '-',
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
                <th>Task ID</th>
                <th>Task Type</th>
                <th>Start Location</th>
                <th>End Location</th>
                <th>AMR ID</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Duration (s)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="atas-task-empty">
                    No tasks available
                  </td>
                </tr>
              ) : (
                tasks.map((task, idx) => (
                  <tr key={`${task.taskId}-${idx}`} className="atas-task-row">
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

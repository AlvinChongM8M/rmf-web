import React from 'react';
import { ApiServerModelsRmfApiRobotStateStatus as Status, type RobotState } from 'api-client';
import { RobotDecommissionButton } from 'rmf-dashboard-framework/components/robots';
import { TaskCancelButton } from 'rmf-dashboard-framework/components/tasks';
import { useRmfApi } from 'rmf-dashboard-framework/hooks';
import { getAtasAmrStatusStyle } from '../atas-amr-status-style';
import '../styles/AtasAmrPage.css';

interface AmrData {
  fleet: string;
  name: string;
  status?: Status;
  battery?: number;
  location?: string;
  currentTask?: string;
  taskId: string | null;
  robotState: RobotState;
}

type AmrSortKey = 'fleet' | 'name' | 'status' | 'battery' | 'location' | 'currentTask';

interface AmrSort {
  key: AmrSortKey;
  direction: 'asc' | 'desc';
}

type AmrStatusStyle = React.CSSProperties & {
  '--status-bg': string;
  '--status-text': string;
  '--status-border': string;
};

const amrCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function amrSortValue(amr: AmrData, key: AmrSortKey): string | number | null {
  switch (key) {
    case 'fleet':
      return amr.fleet;
    case 'name':
      return amr.name;
    case 'status':
      return amr.status ?? null;
    case 'battery':
      return amr.battery ?? null;
    case 'location':
      return amr.location ?? null;
    case 'currentTask':
      return amr.currentTask ?? null;
  }
}

function compareAmrs(left: AmrData, right: AmrData, sort: AmrSort): number {
  const leftValue = amrSortValue(left, sort.key);
  const rightValue = amrSortValue(right, sort.key);

  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;

  const comparison =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : amrCollator.compare(String(leftValue), String(rightValue));
  return comparison * (sort.direction === 'asc' ? 1 : -1);
}

function batteryPercentage(battery?: number): number {
  return battery == null ? 0 : Math.min(100, Math.max(0, battery));
}

export function AtasAmrPage(): JSX.Element {
  const rmfApi = useRmfApi();
  const [amrs, setAmrs] = React.useState<AmrData[]>([]);
  const [sort, setSort] = React.useState<AmrSort>({ key: 'fleet', direction: 'asc' });

  React.useEffect(() => {
    let mounted = true;

    const refreshAmrs = async () => {
      try {
        const fleets = (await rmfApi.fleetsApi.getFleetsFleetsGet()).data;
        const allAmrs: AmrData[] = [];

        for (const fleet of fleets) {
          if (!fleet.name || !fleet.robots) {
            continue;
          }
          for (const [robotName, robot] of Object.entries(fleet.robots)) {
            const taskId = robot.task_id || null;
            const robotState: RobotState = { ...robot, name: robot.name ?? robotName };
            allAmrs.push({
              fleet: fleet.name,
              name: robotName,
              status: robot.status ?? undefined,
              battery: robot.battery != null ? robot.battery * 100 : undefined,
              location: robot.location?.map || '-',
              currentTask: taskId || 'None',
              taskId,
              robotState,
            });
          }
        }

        if (mounted) {
          setAmrs(allAmrs);
        }
      } catch (err) {
        console.error('Failed to fetch AMR fleet data:', err);
      }
    };

    void refreshAmrs();
    const intervalId = window.setInterval(() => {
      void refreshAmrs();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [rmfApi]);

  const getStatusStyle = (status?: Status): AmrStatusStyle => {
    const statusStyle = getAtasAmrStatusStyle(status);
    return {
      '--status-bg': statusStyle.backgroundColor,
      '--status-text': statusStyle.textColor,
      '--status-border': statusStyle.borderColor,
    };
  };

  const sortedAmrs = React.useMemo(
    () =>
      amrs
        .map((amr, index) => ({ amr, index }))
        .sort((left, right) => {
          const comparison = compareAmrs(left.amr, right.amr, sort);
          return comparison === 0 ? left.index - right.index : comparison;
        })
        .map(({ amr }) => amr),
    [amrs, sort],
  );

  const handleSort = (key: AmrSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortHeader = (label: string, key: AmrSortKey) => {
    const isActive = sort.key === key;
    const ariaSort = isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
    return (
      <th aria-sort={ariaSort}>
        <button
          className="atas-amr-sort-button"
          type="button"
          onClick={() => handleSort(key)}
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <span className="atas-amr-sort-indicator" aria-hidden="true">
            {isActive ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="atas-amr-page">
      {/* <div className="atas-amr-header">
        <h2>AMR Fleet Management</h2>
        <p className="atas-amr-count">Total AMRs: {amrs.length}</p>
      </div> */}

      <div className="atas-amr-table-container">
        <table className="atas-amr-table">
          <thead>
            <tr>
              {sortHeader('Fleet', 'fleet')}
              {sortHeader('AMR Name', 'name')}
              {sortHeader('Status', 'status')}
              {sortHeader('Battery (%)', 'battery')}
              {sortHeader('Current Level', 'location')}
              {sortHeader('Current Task', 'currentTask')}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {amrs.length === 0 ? (
              <tr>
                <td colSpan={7} className="atas-amr-empty">
                  No AMRs available
                </td>
              </tr>
            ) : (
              sortedAmrs.map((amr) => (
                <tr key={`${amr.fleet}-${amr.name}`} className="atas-amr-row">
                  <td>{amr.fleet}</td>
                  <td className="atas-amr-name">{amr.name}</td>
                  <td>
                    <span
                      className="atas-amr-status"
                      style={getStatusStyle(amr.status)}
                    >
                      {amr.status || 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <div className="atas-amr-battery">
                      <div
                        className="atas-amr-battery-bar"
                        role="progressbar"
                        aria-label={`${amr.name} battery`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={batteryPercentage(amr.battery)}
                      >
                        <div
                          className="atas-amr-battery-bar__fill"
                          style={{ width: `${batteryPercentage(amr.battery)}%` }}
                        />
                      </div>
                      <span>{amr.battery !== undefined ? `${Math.round(amr.battery)}%` : '-'}</span>
                    </div>
                  </td>
                  <td>{amr.location}</td>
                  <td className="atas-amr-task">{amr.currentTask}</td>
                  <td className="atas-amr-actions">
                    <div
                      className="atas-amr-actions__buttons"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <RobotDecommissionButton
                        fleet={amr.fleet}
                        robotState={amr.robotState}
                        decommissionText="Decommission Robot"
                        recommissionText="Recommission Robot"
                        size="small"
                        variant="contained"
                        color="secondary"
                        sx={{
                          minWidth: '8rem',
                          px: 1,
                          py: 0.35,
                          fontSize: '0.7rem',
                          textTransform: 'none',
                        }}
                      />
                      {amr.taskId && (
                        <TaskCancelButton
                          taskId={amr.taskId}
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
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

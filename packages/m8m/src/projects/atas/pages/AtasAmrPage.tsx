import React from 'react';
import { ApiServerModelsRmfApiRobotStateStatus as Status } from 'api-client';
import { useRmfApi } from 'rmf-dashboard-framework/hooks';
import '../styles/AtasAmrPage.css';

interface AmrData {
  fleet: string;
  name: string;
  status?: Status;
  battery?: number;
  location?: string;
  currentTask?: string;
}

function batteryPercentage(battery?: number): number {
  return battery == null ? 0 : Math.min(100, Math.max(0, battery));
}

export function AtasAmrPage(): JSX.Element {
  const rmfApi = useRmfApi();
  const [amrs, setAmrs] = React.useState<AmrData[]>([]);

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
            allAmrs.push({
              fleet: fleet.name,
              name: robotName,
              status: robot.status ?? undefined,
              battery: robot.battery != null ? robot.battery * 100 : undefined,
              location: robot.location?.map || '-',
              currentTask: robot.task_id || 'None',
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

  const getStatusColor = (status?: Status) => {
    switch (status) {
      case Status.Working:
        return '#22c55e';
      case Status.Charging:
        return '#3b82f6';
      case Status.Error:
        return '#ef4444';
      case Status.Offline:
      case Status.Uninitialized:
        return '#6b7280';
      default:
        return '#f59e0b';
    }
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
              <th>Fleet</th>
              <th>AMR Name</th>
              <th>Status</th>
              <th>Battery (%)</th>
              <th>Current Level</th>
              <th>Current Task</th>
            </tr>
          </thead>
          <tbody>
            {amrs.length === 0 ? (
              <tr>
                <td colSpan={6} className="atas-amr-empty">
                  No AMRs available
                </td>
              </tr>
            ) : (
              amrs.map((amr, idx) => (
                <tr key={`${amr.fleet}-${amr.name}-${idx}`} className="atas-amr-row">
                  <td>{amr.fleet}</td>
                  <td className="atas-amr-name">{amr.name}</td>
                  <td>
                    <span
                      className="atas-amr-status"
                      style={{ '--status-color': getStatusColor(amr.status) } as React.CSSProperties}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { FleetState } from 'api-client';
import React, { useEffect, useState } from 'react';
import { useRmfApi } from 'rmf-dashboard-framework/hooks';
import { EMPTY, merge, switchMap, throttleTime } from 'rxjs';
import '../styles/AtasSystemOverviewPage.css';
import { AtasLiveMap, type AtasLiveMapProps } from './AtasLiveMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AtasSystemStatus {
  fmsState: string;
  tssState: string;
}

export interface AtasSystemPerformance {
  fleetUtilization: string;
  amrAvailability: string;
  operationalAmr: string;
  /** 0–100 */
  bufferTusUtilization: number;
  /** 0–100 */
  endPointTusUtilization: number;
  queuedTasks: number;
}

export interface AtasAmrBattery {
  /** Stable key used when the same robot name exists in multiple fleets. */
  key?: string;
  id: string;
  /** 0–100 */
  level: number;
}

export interface AtasSystemOverviewPageProps {
  status?: AtasSystemStatus;
  performance?: AtasSystemPerformance;
  batteries?: AtasAmrBattery[];
  /**
   * RMF API config — when provided the live RMF map is rendered.
   * When omitted a "Map not available" placeholder is shown.
   */
  rmfMapConfig?: AtasLiveMapProps;
  onStartFms?: () => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_STATUS: AtasSystemStatus = {
  fmsState: 'Idle',
  tssState: 'RUNNING',
};

const DEFAULT_PERFORMANCE: AtasSystemPerformance = {
  fleetUtilization: '1.0x',
  amrAvailability: '3/3',
  operationalAmr: '3/3',
  bufferTusUtilization: 100,
  endPointTusUtilization: 100,
  queuedTasks: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATTERY_UPDATE_THROTTLE_MS = 1000;
const batteryCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function statePillClass(state: string): string {
  return state.toUpperCase() === 'RUNNING'
    ? 'atas-state-pill atas-state-pill--running'
    : 'atas-state-pill atas-state-pill--stopped';
}

function normalizeBatteryPercentage(battery?: number | null): number | null {
  if (battery == null || !Number.isFinite(battery)) {
    return null;
  }

  const percentage = battery <= 1 ? battery * 100 : battery;
  return Math.round(Math.min(100, Math.max(0, percentage)));
}

function batteriesFromFleet(fleet: FleetState): AtasAmrBattery[] {
  if (!fleet.name || !fleet.robots) {
    return [];
  }

  return Object.entries(fleet.robots)
    .flatMap(([robotName, robot]) => {
      const level = normalizeBatteryPercentage(robot.battery);
      if (level == null) {
        return [];
      }

      return [{
        key: `${fleet.name}/${robotName}`,
        id: robot.name || robotName,
        level,
      }];
    });
}

function sortBatteries(batteries: AtasAmrBattery[]): AtasAmrBattery[] {
  return [...batteries].sort((left, right) => batteryCollator.compare(left.id, right.id));
}

function batteriesFromFleets(fleets: FleetState[]): AtasAmrBattery[] {
  return sortBatteries(fleets.flatMap(batteriesFromFleet));
}

function mergeFleetBatteries(
  currentBatteries: AtasAmrBattery[],
  fleet: FleetState,
): AtasAmrBattery[] {
  const fleetKeyPrefix = `${fleet.name}/`;
  const nextFleetBatteries = batteriesFromFleet(fleet);
  return sortBatteries([
    ...currentBatteries.filter((battery) => !battery.key?.startsWith(fleetKeyPrefix)),
    ...nextFleetBatteries,
  ]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AtasSystemOverviewPage({
  status = DEFAULT_STATUS,
  performance = DEFAULT_PERFORMANCE,
  batteries,
  rmfMapConfig,
  onStartFms,
}: AtasSystemOverviewPageProps) {
  const rmfApi = useRmfApi();
  const [batteryExpanded, setBatteryExpanded] = useState(true);
  const [liveBatteries, setLiveBatteries] = useState<AtasAmrBattery[]>([]);
  const [batteryLoading, setBatteryLoading] = useState(true);
  const [batteryError, setBatteryError] = useState<string | null>(null);

  useEffect(() => {
    if (batteries) {
      setBatteryLoading(false);
      setBatteryError(null);
      return;
    }

    let mounted = true;
    setBatteryLoading(true);

    const subscription = rmfApi.fleetsObs
      .pipe(
        switchMap((fleets) => {
          if (mounted) {
            setLiveBatteries(batteriesFromFleets(fleets));
            setBatteryLoading(false);
            setBatteryError(null);
          }

          const fleetNames = fleets
            .map((fleet) => fleet.name)
            .filter((fleetName): fleetName is string => Boolean(fleetName));

          if (fleetNames.length === 0) {
            return EMPTY;
          }

          return merge(
            ...fleetNames.map((fleetName) =>
              rmfApi
                .getFleetStateObs(fleetName)
                .pipe(
                  throttleTime(BATTERY_UPDATE_THROTTLE_MS, undefined, {
                    leading: true,
                    trailing: true,
                  }),
                ),
            ),
          );
        }),
      )
      .subscribe({
        next: (fleet) => {
          if (!mounted) {
            return;
          }
          setLiveBatteries((currentBatteries) => mergeFleetBatteries(currentBatteries, fleet));
          setBatteryLoading(false);
          setBatteryError(null);
        },
        error: (err) => {
          if (!mounted) {
            return;
          }
          console.error('Failed to load AMR battery data:', err);
          setBatteryError((err as Error).message);
          setBatteryLoading(false);
        },
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [batteries, rmfApi]);

  const displayedBatteries = batteries ?? liveBatteries;
  const showBatteryLoading = !batteries && batteryLoading;
  const showBatteryError = !batteries && batteryError;

  return (
    <div className="atas-sysov">

      {/* ── LEFT: Map area ── */}
      <div className="atas-sysov__map-area">
        <div className="atas-sysov__map-container">
          {rmfMapConfig ? (
            <AtasLiveMap {...rmfMapConfig} />
          ) : (
            <span className="atas-sysov__map-placeholder">Map not available</span>
          )}
        </div>
      </div>

      {/* ── RIGHT: Side panels ── */}
      <div className="atas-sysov__panels">

        {/* SYSTEM STATUS */}
        <div className="atas-panel atas-panel--status">
          <div className="atas-panel__title">SYSTEM STATUS</div>

          <div className="atas-status-row">
            <span>FMS State</span>
            <span className={statePillClass(status.fmsState)}>{status.fmsState}</span>
          </div>

          <div className="atas-status-row">
            <span>TSS State</span>
            <span className={statePillClass(status.tssState)}>{status.tssState}</span>
          </div>
        </div>

        {/* SYSTEM PERFORMANCE */}
        <div className="atas-panel atas-panel--performance">
          <div className="atas-panel__title">SYSTEM PERFORMANCE</div>

          {/* Scalar rows */}
          {(
            [
              ['Fleet Utilization',  performance.fleetUtilization],
              ['AMR Availability',   performance.amrAvailability],
              ['Operational AMR',    performance.operationalAmr],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div className="atas-perf-row" key={label}>
              <span>{label}</span>
              <span className="atas-perf-value">{value}</span>
            </div>
          ))}

          {/* Bar rows */}
          {(
            [
              ['Buffer TUS Utilization',    performance.bufferTusUtilization],
              ['End Point TUS Utilization', performance.endPointTusUtilization],
            ] as [string, number][]
          ).map(([label, pct]) => (
            <div className="atas-perf-row" key={label}>
              <span>{label}</span>
              <div className="atas-perf-bar-wrap">
                <div className="atas-perf-bar">
                  <div className="atas-perf-bar__fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="atas-perf-bar-text">{pct}%</span>
              </div>
            </div>
          ))}

          <div className="atas-perf-row">
            <span>Queued Tasks</span>
            <span className="atas-perf-value">{performance.queuedTasks}</span>
          </div>
        </div>

        {/* AMR BATTERY (collapsible) */}
        <div className="atas-panel atas-panel--battery">
          <button
            className="atas-panel__toggle"
            type="button"
            aria-expanded={batteryExpanded}
            onClick={() => setBatteryExpanded((v) => !v)}
          >
            <span className="atas-panel__toggle-title">AMR BATTERY</span>
            <span className="atas-panel__chevron" aria-hidden="true">
              {batteryExpanded ? '▾' : '▸'}
            </span>
          </button>

          {batteryExpanded && (
            <div className="atas-battery-body">
              {showBatteryLoading ? (
                <div className="atas-battery-empty">Loading AMR battery data...</div>
              ) : showBatteryError ? (
                <div className="atas-battery-error">{showBatteryError}</div>
              ) : displayedBatteries.length === 0 ? (
                <div className="atas-battery-empty">No AMR battery data</div>
              ) : (
                displayedBatteries.map((battery) => (
                  <div className="atas-battery-row" key={battery.key ?? battery.id}>
                    <span className="atas-battery-name">{battery.id}</span>
                    <div className="atas-battery-bar">
                      <div
                        className="atas-battery-bar__fill"
                        style={{ width: `${battery.level}%` }}
                      />
                    </div>
                    <span className="atas-battery-pct">{battery.level}%</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* CONTROL CENTER */}
        <div className="atas-panel atas-panel--control">
          <div className="atas-panel__title">CONTROL CENTER</div>
          <button className="atas-control-btn" type="button" onClick={onStartFms}>
            START FMS
          </button>
          <div className="atas-control-note">
            * Available to Operator and Administrator roles only.
          </div>
        </div>

      </div>
    </div>
  );
}

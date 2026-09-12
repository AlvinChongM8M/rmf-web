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
  taskOrchestratorServerUrl?: string;
  taskOrchestratorRefreshIntervalMs?: number;
  tssServerUrl?: string;
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

interface OrchestratorAutomationState {
  desired_running: boolean;
  effective_state: string;
  run_id: string | null;
  started_by: string | null;
  changed_by: string;
  changed_at: string;
  heartbeat_at: string | null;
  last_error: string | null;
  diagnostics: Record<string, unknown>;
}

interface TssSystemStatus {
  tss_name: string;
  plc_state: number | null;
  plc_state_description: string;
  robot_state: number | null;
  robot_state_description: string;
}

function statePillClass(state: string): string {
  switch (state.toUpperCase()) {
    case 'RUNNING':
    case 'ONLINE':
    case 'READY':
      return 'atas-state-pill atas-state-pill--running';
    case 'STARTING':
    case 'STOPPING':
      return 'atas-state-pill atas-state-pill--transition';
    case 'WORKER_UNAVAILABLE':
    case 'UNAVAILABLE':
    case 'ERROR':
    case 'FAULT':
    case 'OFFLINE':
    case 'DISCONNECTED':
      return 'atas-state-pill atas-state-pill--error';
    case 'STOPPED':
      return 'atas-state-pill atas-state-pill--stopped';
    default:
      return 'atas-state-pill atas-state-pill--unknown';
  }
}

function displayState(state: string): string {
  return state.replace(/_/g, ' ');
}

function systemStatusWebsocketUrl(serverUrl: string): string {
  const url = new URL(serverUrl, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/api/system-status`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function aggregatePlcState(statuses: TssSystemStatus[]): string {
  if (statuses.length === 0) {
    return 'WAITING';
  }

  const states = new Set(
    statuses.map((status) => status.plc_state_description.trim() || 'UNKNOWN'),
  );
  return states.size === 1 ? [...states][0] : 'MIXED';
}

function systemStatusTitle(statuses: TssSystemStatus[]): string | undefined {
  if (statuses.length === 0) {
    return undefined;
  }
  return statuses
    .map(
      (status) =>
        `${status.tss_name}: ${displayState(status.plc_state_description)} (${status.plc_state ?? '-'})`,
    )
    .join('\n');
}

async function orchestratorResponseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) {
      return new Error(body.detail);
    }
  } catch {
    // Use the HTTP status when the response body is unavailable.
  }
  return new Error(`Request failed (${response.status} ${response.statusText})`);
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
  taskOrchestratorServerUrl,
  taskOrchestratorRefreshIntervalMs = 5000,
  tssServerUrl,
  rmfMapConfig,
  onStartFms,
}: AtasSystemOverviewPageProps) {
  const rmfApi = useRmfApi();
  const [batteryExpanded, setBatteryExpanded] = useState(true);
  const [liveBatteries, setLiveBatteries] = useState<AtasAmrBattery[]>([]);
  const [batteryLoading, setBatteryLoading] = useState(true);
  const [batteryError, setBatteryError] = useState<string | null>(null);
  const [automationState, setAutomationState] = useState<OrchestratorAutomationState | null>(
    null,
  );
  const [automationLoading, setAutomationLoading] = useState(Boolean(taskOrchestratorServerUrl));
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [automationControlTarget, setAutomationControlTarget] = useState<boolean | null>(null);
  const [tssSystemStatuses, setTssSystemStatuses] = useState<TssSystemStatus[]>([]);
  const [tssStatusLoading, setTssStatusLoading] = useState(Boolean(tssServerUrl));
  const [tssStatusError, setTssStatusError] = useState<string | null>(null);
  const normalizedOrchestratorUrl = React.useMemo(
    () => taskOrchestratorServerUrl?.replace(/\/$/, ''),
    [taskOrchestratorServerUrl],
  );
  const normalizedTssServerUrl = React.useMemo(
    () => tssServerUrl?.replace(/\/$/, ''),
    [tssServerUrl],
  );

  useEffect(() => {
    if (!normalizedOrchestratorUrl) {
      setAutomationLoading(false);
      return;
    }

    const controller = new AbortController();
    const refreshAutomationState = async () => {
      try {
        const response = await fetch(`${normalizedOrchestratorUrl}/api/v1/automation`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw await orchestratorResponseError(response);
        }
        setAutomationState((await response.json()) as OrchestratorAutomationState);
        setAutomationError(null);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to load task orchestrator state:', error);
          setAutomationError((error as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setAutomationLoading(false);
        }
      }
    };

    void refreshAutomationState();
    const intervalId = window.setInterval(
      () => void refreshAutomationState(),
      taskOrchestratorRefreshIntervalMs,
    );
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [normalizedOrchestratorUrl, taskOrchestratorRefreshIntervalMs]);

  useEffect(() => {
    if (!normalizedTssServerUrl) {
      setTssStatusLoading(false);
      return;
    }

    let stopped = false;
    let socket: WebSocket | undefined;
    let reconnectTimer: number | undefined;

    const connect = () => {
      setTssStatusLoading(true);
      try {
        socket = new WebSocket(systemStatusWebsocketUrl(normalizedTssServerUrl));
      } catch (error) {
        setTssStatusLoading(false);
        setTssStatusError((error as Error).message);
        reconnectTimer = window.setTimeout(connect, 3000);
        return;
      }

      socket.onopen = () => setTssStatusError(null);
      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(String(message.data)) as unknown;
          if (!Array.isArray(data)) {
            throw new Error('Unexpected TSS system-status response');
          }
          setTssSystemStatuses(data as TssSystemStatus[]);
          setTssStatusLoading(false);
          setTssStatusError(null);
        } catch (error) {
          console.error('Failed to read TSS system status:', error);
          setTssStatusLoading(false);
          setTssStatusError((error as Error).message);
        }
      };
      socket.onerror = () => {
        setTssStatusLoading(false);
        setTssStatusError('TSS system-status connection failed');
      };
      socket.onclose = () => {
        if (!stopped) {
          setTssStatusLoading(false);
          setTssStatusError('TSS system-status connection lost; reconnecting…');
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [normalizedTssServerUrl]);

  const toggleFms = async () => {
    if (!normalizedOrchestratorUrl) {
      onStartFms?.();
      return;
    }
    if (!automationState || automationControlTarget !== null) {
      return;
    }

    const targetRunning = !automationState.desired_running;
    setAutomationControlTarget(targetRunning);
    setAutomationError(null);
    try {
      const action = targetRunning ? 'start' : 'stop';
      const response = await fetch(
        `${normalizedOrchestratorUrl}/api/v1/automation/${action}`,
        { method: 'POST' },
      );
      if (!response.ok) {
        throw await orchestratorResponseError(response);
      }
      setAutomationState((await response.json()) as OrchestratorAutomationState);
    } catch (error) {
      console.error('Failed to control task orchestrator:', error);
      setAutomationError((error as Error).message);
    } finally {
      setAutomationControlTarget(null);
    }
  };

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
  const fmsState = normalizedOrchestratorUrl
    ? automationError
      ? 'UNAVAILABLE'
      : automationState?.effective_state ?? (automationLoading ? 'LOADING' : 'UNAVAILABLE')
    : status.fmsState;
  const fmsRunning = automationState?.desired_running ?? false;
  const fmsControlDisabled = Boolean(
    normalizedOrchestratorUrl &&
      (!automationState || automationError || automationControlTarget !== null),
  );
  const fmsControlLabel =
    automationControlTarget === true
      ? 'STARTING FMS…'
      : automationControlTarget === false
        ? 'STOPPING FMS…'
        : fmsRunning
          ? 'STOP FMS'
          : 'START FMS';
  const tssState = normalizedTssServerUrl
    ? tssStatusError
      ? 'UNAVAILABLE'
      : tssStatusLoading
        ? 'LOADING'
        : aggregatePlcState(tssSystemStatuses)
    : status.tssState;
  const tssStateTitle = tssStatusError
    ? tssStatusError
    : systemStatusTitle(tssSystemStatuses);

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
            <span
              className={statePillClass(fmsState)}
              title={automationState?.last_error ?? undefined}
            >
              {displayState(fmsState)}
            </span>
          </div>

          {automationError && (
            <div className="atas-status-error" title={automationError}>
              FMS: {automationError}
            </div>
          )}

          <div className="atas-status-row">
            <span>TSS State</span>
            <span className={statePillClass(tssState)} title={tssStateTitle}>
              {displayState(tssState)}
            </span>
          </div>

          {tssStatusError && (
            <div className="atas-status-error" title={tssStatusError}>
              TSS: {tssStatusError}
            </div>
          )}
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
          <button
            className={`atas-control-btn ${
              fmsRunning ? 'atas-control-btn--stop' : 'atas-control-btn--start'
            }`}
            type="button"
            disabled={fmsControlDisabled}
            onClick={() => void toggleFms()}
          >
            {fmsControlLabel}
          </button>
          <div className="atas-control-note">
            * Available to Operator and Administrator roles only.
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import './AtasSystemOverviewPage.css';

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
  id: string;
  /** 0–100 */
  level: number;
}

export interface AtasSystemOverviewPageProps {
  status?: AtasSystemStatus;
  performance?: AtasSystemPerformance;
  batteries?: AtasAmrBattery[];
  /** Path/URL to the map image. Falls back to a placeholder when the image cannot load. */
  mapSrc?: string;
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

const DEFAULT_BATTERIES: AtasAmrBattery[] = [
  { id: 'AMR-001', level: 78 },
  { id: 'AMR-002', level: 42 },
  { id: 'AMR-003', level: 72 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statePillClass(state: string): string {
  return state.toUpperCase() === 'RUNNING'
    ? 'atas-state-pill atas-state-pill--running'
    : 'atas-state-pill atas-state-pill--stopped';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AtasSystemOverviewPage({
  status = DEFAULT_STATUS,
  performance = DEFAULT_PERFORMANCE,
  batteries = DEFAULT_BATTERIES,
  mapSrc = '/assets/img/map.jpeg',
  onStartFms,
}: AtasSystemOverviewPageProps) {
  const [batteryExpanded, setBatteryExpanded] = useState(true);
  const [mapError, setMapError] = useState(false);

  return (
    <div className="atas-sysov">

      {/* ── LEFT: Map area ── */}
      <div className="atas-sysov__map-area">
        <div className="atas-sysov__map-container">
          {mapError ? (
            <span className="atas-sysov__map-placeholder">Map not available</span>
          ) : (
            <img
              src={mapSrc}
              className="atas-sysov__map-img"
              alt="Live site map"
              onError={() => setMapError(true)}
            />
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
              {batteries.map((b) => (
                <div className="atas-battery-row" key={b.id}>
                  <span className="atas-battery-name">{b.id}</span>
                  <div className="atas-battery-bar">
                    <div className="atas-battery-bar__fill" style={{ width: `${b.level}%` }} />
                  </div>
                  <span className="atas-battery-pct">{b.level}%</span>
                </div>
              ))}
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

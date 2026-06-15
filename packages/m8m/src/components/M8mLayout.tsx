import React from 'react';
import { M8mAppBar, M8mAppBarProps } from './M8mAppBar';
import { M8mAlarmBar, M8mAlarm } from './M8mAlarmBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface M8mLayoutProps extends M8mAppBarProps {
  /**
   * When true the alarm-bar footer is rendered.
   * Set to false on pages whose body already shows alarm content (e.g. Active Alarm screen).
   * @default true
   */
  showAlarmBar?: boolean;

  /** Alarms to display in the alarm-bar footer */
  alarms?: M8mAlarm[];

  /** Page body content */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * M8mLayout — the standard three-zone page shell used by every screen:
 *
 *   ┌─────────────────────────────────┐  ← M8mAppBar  (10 vh)
 *   │             HEADER              │
 *   ├─────────────────────────────────┤
 *   │                                 │  ← children (flex: 1, fills remaining space)
 *   │              BODY               │
 *   │                                 │
 *   ├─────────────────────────────────┤
 *   │           ALARM BAR             │  ← M8mAlarmBar (20 vh) — hidden when showAlarmBar=false
 *   └─────────────────────────────────┘
 */
export function M8mLayout({
  showAlarmBar = true,
  alarms = [],
  children,
  ...appBarProps
}: M8mLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <M8mAppBar {...appBarProps} />

      <main
        style={{
          flex: 1,
          overflow: 'hidden',
          minHeight: 0, // allow flex child to shrink below content size
        }}
      >
        {children}
      </main>

      {showAlarmBar && <M8mAlarmBar alarms={alarms} />}
    </div>
  );
}

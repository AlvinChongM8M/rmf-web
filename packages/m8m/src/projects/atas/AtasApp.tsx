/**
 * AtasApp.tsx
 *
 * ATAS application shell.
 * Contains:
 *   - AtasPage  — layout wrapper (M8mLayout pre-configured for ATAS)
 *   - AtasApp   — router + route table
 *
 * To add a new screen:
 *   1. Create the page component under ./pages/
 *   2. Add a <Route> entry below
 *   3. Done — header, footer and nav are inherited automatically
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { M8mLayout } from '../../components/M8mLayout';
import { M8mNewTaskButton } from '../../components/M8mNewTaskButton';
import {
  ATAS_ALARM_RECORD_LIMIT,
  ATAS_ALARM_REFRESH_INTERVAL_MS,
  ATAS_ALARM_SERVER_URL,
  ATAS_API_SERVER_URL,
  ATAS_CLIENT_LOGO_SRC,
  ATAS_LOGO_SRC,
  ATAS_NAV_ITEMS,
  ATAS_SHOW_NEW_TASK_BUTTON,
  ATAS_TITLE,
  ATAS_TRAJECTORY_SERVER_URL,
  ATAS_TUS_EVENT_RECORD_LIMIT,
  ATAS_TUS_EVENT_REFRESH_INTERVAL_MS,
  ATAS_TUS_SERVER_URL,
  ATAS_USERNAME,
  ATAS_USER_ROLE,
} from './atas-config';
import { AtasAlarmProvider, useAtasAlarms } from './AtasAlarmProvider';
import { AtasRmfProviders } from './AtasRmfProviders';
import { AtasActiveAlarmPage } from './pages/AtasActiveAlarmPage';
import { AtasAmrPage } from './pages/AtasAmrPage';
import { AtasHistoricalAlarmPage } from './pages/AtasHistoricalAlarmPage';
import { AtasSystemOverviewPage } from './pages/AtasSystemOverviewPage';
import { AtasTaskPage } from './pages/AtasTaskPage';
import { AtasTusPage } from './pages/AtasTusPage';

// ---------------------------------------------------------------------------
// Layout wrapper — shared by every ATAS screen
// ---------------------------------------------------------------------------

interface AtasPageProps {
  subtitle: string;
  /**
   * Pass false on the Active Alarm screen — its body already shows all alarm
   * detail, making the footer alarm bar redundant.
   */
  showAlarmBar?: boolean;
  children: React.ReactNode;
}

function AtasPage({ subtitle, showAlarmBar = true, children }: AtasPageProps) {
  const {
    alarms,
    loading,
    error,
    acknowledgeAlarm,
    acknowledgeAll,
    acknowledgingAlarmIds,
    acknowledgingAll,
  } = useAtasAlarms();

  return (
    <M8mLayout
      title={ATAS_TITLE}
      subtitle={subtitle}
      navItems={ATAS_NAV_ITEMS}
      username={ATAS_USERNAME}
      userRole={ATAS_USER_ROLE}
      logoSrc={ATAS_LOGO_SRC}
      clientLogoSrc={ATAS_CLIENT_LOGO_SRC}
      showAlarmBar={showAlarmBar}
      alarms={alarms}
      alarmsLoading={loading}
      alarmsError={error}
      onAcknowledgeAlarm={acknowledgeAlarm}
      onAcknowledgeAll={acknowledgeAll}
      acknowledgingAlarmIds={acknowledgingAlarmIds}
      acknowledgingAll={acknowledgingAll}
      floatingAction={
        ATAS_SHOW_NEW_TASK_BUTTON ? (
          <M8mNewTaskButton username={ATAS_USERNAME} buttonId="atas-new-task-button" />
        ) : undefined
      }
    >
      {children}
    </M8mLayout>
  );
}

// ---------------------------------------------------------------------------
// Placeholder — used for routes not yet implemented
// ---------------------------------------------------------------------------

function ComingSoon({ name }: { name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#9ca3af',
        fontSize: '1.8vh',
      }}
    >
      {name} — coming soon
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

export function AtasApp() {
  return (
    <BrowserRouter>
      <AtasRmfProviders
        apiServerUrl={ATAS_API_SERVER_URL}
        trajectoryServerUrl={ATAS_TRAJECTORY_SERVER_URL}
        username={ATAS_USERNAME}
        userRole={ATAS_USER_ROLE}
      >
        <AtasAlarmProvider
          serverUrl={ATAS_ALARM_SERVER_URL}
          username={ATAS_USERNAME}
          refreshIntervalMs={ATAS_ALARM_REFRESH_INTERVAL_MS}
          recordLimit={ATAS_ALARM_RECORD_LIMIT}
        >
          <Routes>

        {/* ── Implemented screens ── */}
        <Route
          path="/"
          element={
            <AtasPage subtitle="System Overview">
              <AtasSystemOverviewPage
                rmfMapConfig={{
                  apiServerUrl: ATAS_API_SERVER_URL,
                  trajectoryServerUrl: ATAS_TRAJECTORY_SERVER_URL,
                  defaultZoom: 35,
                }}
              />
            </AtasPage>
          }
        />

        {/* ── Active Alarm: body IS the alarm content — hide footer bar ── */}
        <Route
          path="/alarm"
          element={
            <AtasPage subtitle="Active Alarm" showAlarmBar={false}>
              <AtasActiveAlarmPage />
            </AtasPage>
          }
        />

        {/* ── Placeholder routes — replace <ComingSoon> with real pages as built ── */}
        <Route
          path="/amr"
          element={
            <AtasPage subtitle="AMR Monitoring">
              <AtasAmrPage />
            </AtasPage>
          }
        />
        <Route
          path="/tus"
          element={
            <AtasPage subtitle="TUS Monitoring">
              <AtasTusPage
                serverUrl={ATAS_TUS_SERVER_URL}
                eventRefreshIntervalMs={ATAS_TUS_EVENT_REFRESH_INTERVAL_MS}
                eventRecordLimit={ATAS_TUS_EVENT_RECORD_LIMIT}
              />
            </AtasPage>
          }
        />
        <Route
          path="/task"
          element={
            <AtasPage subtitle="Task Monitoring">
              <AtasTaskPage />
            </AtasPage>
          }
        />
        <Route
          path="/historical-alarm"
          element={
            <AtasPage subtitle="Historical Alarm" showAlarmBar={false}>
              <AtasHistoricalAlarmPage
                serverUrl={ATAS_ALARM_SERVER_URL}
                refreshIntervalMs={ATAS_ALARM_REFRESH_INTERVAL_MS}
                recordLimit={ATAS_ALARM_RECORD_LIMIT}
              />
            </AtasPage>
          }
        />
        <Route path="/scheduler"        element={<AtasPage subtitle="Scheduler"><ComingSoon name="Scheduler" /></AtasPage>} />
        <Route path="/path-planning"    element={<AtasPage subtitle="Path Planning"><ComingSoon name="Path Planning" /></AtasPage>} />
        <Route path="/legend"           element={<AtasPage subtitle="Legend"><ComingSoon name="Legend" /></AtasPage>} />
        <Route path="/maintenance"      element={<AtasPage subtitle="Maintenance"><ComingSoon name="Maintenance" /></AtasPage>} />
        <Route path="/report"           element={<AtasPage subtitle="Report"><ComingSoon name="Report" /></AtasPage>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </AtasAlarmProvider>
      </AtasRmfProviders>
    </BrowserRouter>
  );
}

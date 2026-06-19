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
import {
  ATAS_API_SERVER_URL,
  ATAS_CLIENT_LOGO_SRC,
  ATAS_LOGO_SRC,
  ATAS_NAV_ITEMS,
  ATAS_TITLE,
  ATAS_TRAJECTORY_SERVER_URL,
} from './atas-config';
import { AtasRmfProviders } from './AtasRmfProviders';
import { AtasAmrPage } from './pages/AtasAmrPage';
import { AtasSystemOverviewPage } from './pages/AtasSystemOverviewPage';
import { AtasTaskPage } from './pages/AtasTaskPage';

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
  return (
    <M8mLayout
      title={ATAS_TITLE}
      subtitle={subtitle}
      navItems={ATAS_NAV_ITEMS}
      username="CAG_Admin"
      userRole="Administrator"
      logoSrc={ATAS_LOGO_SRC}
      clientLogoSrc={ATAS_CLIENT_LOGO_SRC}
      showAlarmBar={showAlarmBar}
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
              <ComingSoon name="Active Alarm" />
            </AtasPage>
          }
        />

        {/* ── Placeholder routes — replace <ComingSoon> with real pages as built ── */}
        <Route
          path="/amr"
          element={
            <AtasPage subtitle="AMR">
              <AtasRmfProviders
                apiServerUrl={ATAS_API_SERVER_URL}
                trajectoryServerUrl={ATAS_TRAJECTORY_SERVER_URL}
              >
                <AtasAmrPage />
              </AtasRmfProviders>
            </AtasPage>
          }
        />
        <Route path="/tus"              element={<AtasPage subtitle="TUS"><ComingSoon name="TUS" /></AtasPage>} />
        <Route
          path="/task"
          element={
            <AtasPage subtitle="Task">
              <AtasRmfProviders
                apiServerUrl={ATAS_API_SERVER_URL}
                trajectoryServerUrl={ATAS_TRAJECTORY_SERVER_URL}
              >
                <AtasTaskPage />
              </AtasRmfProviders>
            </AtasPage>
          }
        />
        <Route path="/historical-alarm" element={<AtasPage subtitle="Historical Alarm"><ComingSoon name="Historical Alarm" /></AtasPage>} />
        <Route path="/scheduler"        element={<AtasPage subtitle="Scheduler"><ComingSoon name="Scheduler" /></AtasPage>} />
        <Route path="/path-planning"    element={<AtasPage subtitle="Path Planning"><ComingSoon name="Path Planning" /></AtasPage>} />
        <Route path="/legend"           element={<AtasPage subtitle="Legend"><ComingSoon name="Legend" /></AtasPage>} />
        <Route path="/maintenance"      element={<AtasPage subtitle="Maintenance"><ComingSoon name="Maintenance" /></AtasPage>} />
        <Route path="/report"           element={<AtasPage subtitle="Report"><ComingSoon name="Report" /></AtasPage>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

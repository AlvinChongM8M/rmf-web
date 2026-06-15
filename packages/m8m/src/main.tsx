import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

// M8M framework styles (global reset + CSS variables)
import './m8m-base.css';

// M8M reusable components
import { M8mLayout } from './components/M8mLayout';
import type { M8mNavItem } from './components/M8mAppBar';

// ATAS project pages
import { AtasSystemOverviewPage } from './pages/atas/AtasSystemOverviewPage';

/* ==========================================================================
   ATAS Project Configuration
   --------------------------------------------------------------------------
   All project-specific values live here.
   To adapt the M8M framework for a different project, create a new section
   like this (or a separate config file) and swap it into <AtasPage />.
   ========================================================================== */

const ATAS_TITLE = 'ATAS Fleet Management System';
const ATAS_LOGO_SRC = '/assets/img/logos/m8m_logo.jpg';
const ATAS_CLIENT_LOGO_SRC = '/assets/img/logos/cag_logo.svg';

const ATAS_NAV_ITEMS: M8mNavItem[] = [
  { key: 'sys',    label: 'SYS',    route: '/',                  iconSrc: '/assets/img/icons/system_overview_icon.png' },
  { key: 'amr',    label: 'AMR',    route: '/amr',               iconSrc: '/assets/img/icons/amr_icon.png' },
  { key: 'tus',    label: 'TUS',    route: '/tus',               iconSrc: '/assets/img/icons/tus_icon.png' },
  { key: 'task',   label: 'TASK',   route: '/task',              iconSrc: '/assets/img/icons/task_icon.png' },
  { key: 'alarm',  label: 'ALM',    route: '/alarm',             iconSrc: '/assets/img/icons/alarm_icon.png' },
  { key: 'halarm', label: 'H-ALM',  route: '/historical-alarm',  iconSrc: '/assets/img/icons/historical_alarm_icon.png' },
  { key: 'sch',    label: 'SCH',    route: '/scheduler',         iconSrc: '/assets/img/icons/schedular_icon.png' },
  { key: 'path',   label: 'PATH',   route: '/path-planning',     iconSrc: '/assets/img/icons/path_planning.png' },
  { key: 'legend', label: 'LEG',    route: '/legend',            iconSrc: '/assets/img/icons/legend_icon.png' },
  { key: 'mnt',    label: 'MNT',    route: '/maintenance',       iconSrc: '/assets/img/icons/configuration_icon.png' },
  { key: 'report', label: 'RPT',    route: '/report',            iconSrc: '/assets/img/icons/generate_report_icon.png' },
  { key: 'logout', label: 'LOGOUT', route: '/logout', isLogout: true, iconSrc: '/assets/img/icons/logout_icon.png' },
];

/* ==========================================================================
   ATAS page wrapper
   --------------------------------------------------------------------------
   Wraps M8mLayout with ATAS-specific config so each page only needs to
   supply its own subtitle and body content.
   ========================================================================== */

interface AtasPageProps {
  subtitle: string;
  /**
   * Pass false on the Active Alarm screen — its body already shows full
   * alarm detail so the footer alarm bar is redundant.
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

/* ==========================================================================
   Placeholder for pages not yet implemented
   ========================================================================== */

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

/* ==========================================================================
   Router
   ========================================================================== */

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── System Overview ── */}
        <Route
          path="/"
          element={
            <AtasPage subtitle="System Overview">
              <AtasSystemOverviewPage />
            </AtasPage>
          }
        />

        {/* ── Active Alarm  (no footer alarm bar — body IS the alarm screen) ── */}
        <Route
          path="/alarm"
          element={
            <AtasPage subtitle="Active Alarm" showAlarmBar={false}>
              <ComingSoon name="Active Alarm" />
            </AtasPage>
          }
        />

        {/* ── Placeholder routes — replace body with real page components as built ── */}
        <Route path="/amr"              element={<AtasPage subtitle="AMR"><ComingSoon name="AMR" /></AtasPage>} />
        <Route path="/tus"              element={<AtasPage subtitle="TUS"><ComingSoon name="TUS" /></AtasPage>} />
        <Route path="/task"             element={<AtasPage subtitle="Task"><ComingSoon name="Task" /></AtasPage>} />
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

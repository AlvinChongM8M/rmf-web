/**
 * atas-config.ts
 *
 * Single source of truth for all ATAS project constants.
 * Change values here to adapt the M8M framework for a different deployment
 * without touching component code.
 */

import type { M8mNavItem } from '../../components/M8mAppBar';

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

export const ATAS_TITLE = 'ATAS Fleet Management System';
export const ATAS_LOGO_SRC = '/assets/img/logos/m8m_logo.jpg';
export const ATAS_CLIENT_LOGO_SRC = '/assets/img/logos/cag_logo.svg';

// ---------------------------------------------------------------------------
// RMF server endpoints  —  update to match your deployment
// ---------------------------------------------------------------------------

export const ATAS_API_SERVER_URL = 'http://localhost:8000';
export const ATAS_TRAJECTORY_SERVER_URL = 'http://localhost:8006';
export const ATAS_ALARM_SERVER_URL =
  import.meta.env.VITE_ATAS_ALARM_SERVER_URL ?? 'http://localhost:10020';
export const ATAS_ALARM_REFRESH_INTERVAL_MS = 2500;
export const ATAS_ALARM_RECORD_LIMIT = 1000;
export const ATAS_TUS_SERVER_URL =
  import.meta.env.VITE_ATAS_TUS_SERVER_URL ?? '/tus-service';
export const ATAS_TUS_EVENT_REFRESH_INTERVAL_MS = 5000;
export const ATAS_TUS_EVENT_RECORD_LIMIT = 1000;
export const ATAS_TUS_CONFIG_REFRESH_INTERVAL_MS = 5000;
export const ATAS_USERNAME = 'CAG_Admin';
export const ATAS_USER_ROLE = 'Administrator';
// Set VITE_ATAS_SHOW_NEW_TASK_BUTTON=false to hide the floating action without code changes.
export const ATAS_SHOW_NEW_TASK_BUTTON =
  import.meta.env.VITE_ATAS_SHOW_NEW_TASK_BUTTON !== 'false';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export const ATAS_NAV_ITEMS: M8mNavItem[] = [
  { key: 'sys',    label: 'SYS',    route: '/',                  iconSrc: '/assets/img/icons/system_overview_icon.png' },
  { key: 'amr',    label: 'AMR',    route: '/amr',               iconSrc: '/assets/img/icons/amr_icon.png' },
  { key: 'tus',    label: 'TUS',    route: '/tus',               iconSrc: '/assets/img/icons/tus_icon.png' },
  { key: 'task',   label: 'TASK',   route: '/task',              iconSrc: '/assets/img/icons/task_icon.png' },
  { key: 'alarm',  label: 'ALM',    route: '/alarm',             iconSrc: '/assets/img/icons/alarm_icon.png' },
  { key: 'halarm', label: 'H-ALM',  route: '/historical-alarm',  iconSrc: '/assets/img/icons/historical_alarm_icon.png' },
  { key: 'sch',    label: 'SCH',    route: '/scheduler',         iconSrc: '/assets/img/icons/schedular_icon.png' },
  { key: 'path',   label: 'PATH',   route: '/path-planning',     iconSrc: '/assets/img/icons/path_planning.png' },
  { key: 'legend', label: 'LEG',    route: '/legend',            iconSrc: '/assets/img/icons/legend_icon.png' },
  { key: 'mnt',    label: 'MNT',    route: '/configuration',     iconSrc: '/assets/img/icons/configuration_icon.png' },
  { key: 'report', label: 'RPT',    route: '/report',            iconSrc: '/assets/img/icons/generate_report_icon.png' },
  { key: 'logout', label: 'LOGOUT', route: '/logout', isLogout: true, iconSrc: '/assets/img/icons/logout_icon.png' },
];

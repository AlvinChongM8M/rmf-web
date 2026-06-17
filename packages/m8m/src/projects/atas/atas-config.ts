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
  { key: 'mnt',    label: 'MNT',    route: '/maintenance',       iconSrc: '/assets/img/icons/configuration_icon.png' },
  { key: 'report', label: 'RPT',    route: '/report',            iconSrc: '/assets/img/icons/generate_report_icon.png' },
  { key: 'logout', label: 'LOGOUT', route: '/logout', isLogout: true, iconSrc: '/assets/img/icons/logout_icon.png' },
];

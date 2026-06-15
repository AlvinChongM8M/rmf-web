import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './M8mAppBar.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface M8mNavItem {
  /** Unique key for React reconciliation */
  key: string;
  /** Short label shown on the button */
  label: string;
  /** Router path this button navigates to */
  route: string;
  /** Optional URL/path to an icon image rendered above the label */
  iconSrc?: string;
  /** When true the button renders with a logout style and calls onLogout instead of navigating */
  isLogout?: boolean;
}

export interface M8mAppBarProps {
  /** Main application title (top-left) */
  title: string;
  /** Current page subtitle shown below the title */
  subtitle?: string;
  /** Navigation buttons rendered in the center scrollable area */
  navItems: M8mNavItem[];
  /** Logged-in username */
  username?: string;
  /** User role / access level */
  userRole?: string;
  /** URL or path to the application/vendor logo (left side) */
  logoSrc?: string;
  /** URL or path to the client/tenant logo (right side) */
  clientLogoSrc?: string;
  /** Called when the logout nav item is clicked */
  onLogout?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function M8mAppBar({
  title,
  subtitle,
  navItems,
  username,
  userRole,
  logoSrc,
  clientLogoSrc,
  onLogout,
}: M8mAppBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [datetime, setDatetime] = useState('');
  // Tracks nav items whose icon failed to load → fall back to text label
  const [iconErrors, setIconErrors] = useState<ReadonlySet<string>>(new Set());
  const markIconError = useRef((key: string) =>
    setIconErrors((prev) => new Set([...prev, key])),
  ).current;

  // Live clock
  useEffect(() => {
    const format = (d: Date): string => {
      const p = (n: number) => String(n).padStart(2, '0');
      return (
        `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
        `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
      );
    };
    setDatetime(format(new Date()));
    const id = setInterval(() => setDatetime(format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const handleNav = (item: M8mNavItem) => {
    if (item.isLogout) {
      onLogout?.();
    } else {
      navigate(item.route);
    }
  };

  const isActive = (item: M8mNavItem): boolean => {
    if (item.isLogout) return false;
    if (item.route === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.route);
  };

  const btnClass = (item: M8mNavItem): string =>
    [
      'm8m-nav-btn',
      isActive(item) ? 'm8m-nav-btn--active' : '',
      item.isLogout ? 'm8m-nav-btn--logout' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <header className="m8m-header">
      {/* LEFT: Logo + Titles */}
      <div className="m8m-header__left">
        {logoSrc && (
          <img
            src={logoSrc}
            className="m8m-header__logo"
            alt="Logo"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="m8m-header__titles">
          <span className="m8m-header__title">{title}</span>
          {subtitle && <span className="m8m-header__subtitle">{subtitle}</span>}
        </div>
      </div>

      {/* CENTER: Nav buttons */}
      <nav className="m8m-header__nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={btnClass(item)}
            onClick={() => handleNav(item)}
            title={item.label}
            type="button"
          >
            {item.iconSrc && !iconErrors.has(item.key) ? (
              <img
                src={item.iconSrc}
                className="m8m-nav-btn__icon"
                alt=""
                aria-hidden="true"
                onError={() => markIconError(item.key)}
              />
            ) : (
              <span>{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* RIGHT: User info + Client logo */}
      <div className="m8m-header__right">
        {(username || userRole || datetime) && (
          <div className="m8m-header__user-info">
            {username && <div className="m8m-header__user-name">{username}</div>}
            {userRole && <div className="m8m-header__user-role">{userRole}</div>}
            {datetime && <div className="m8m-header__user-datetime">{datetime}</div>}
          </div>
        )}
        {clientLogoSrc && (
          <img
            src={clientLogoSrc}
            className="m8m-header__client-logo"
            alt="Client Logo"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>
    </header>
  );
}

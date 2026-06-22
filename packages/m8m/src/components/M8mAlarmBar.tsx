import { useMemo, useState } from 'react';

import './M8mAlarmBar.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface M8mAlarm {
  /** Unique identifier for React key prop */
  id: string;
  datetime: string;
  /** Raw timestamp used for reliable datetime sorting. */
  sortTimestamp?: number;
  /** Severity or priority label supplied by the application. */
  priority: string;
  equipmentId: string;
  alarmCode: string;
  description: string;
  value: string;
  /** "ACTIVE" | "ACKNOWLEDGED" | "CLEARED" or any custom string */
  state: string;
  /** Whether this alarm may currently be acknowledged. */
  acknowledgeable?: boolean;
}

export interface M8mAlarmBarProps {
  /** Compact footer or full-height page presentation. */
  variant?: 'footer' | 'page';
  /** List of unresolved alarms to display. Defaults to empty (shows placeholder row). */
  alarms?: M8mAlarm[];
  /** True while the first unresolved-alarm request is in progress. */
  loading?: boolean;
  /** Message shown when unresolved alarms cannot be loaded or acknowledged. */
  error?: string | null;
  /** Called when an acknowledgeable row is double-clicked. */
  onAcknowledgeAlarm?: (alarm: M8mAlarm) => void;
  /** Called by the Acknowledge All button. */
  onAcknowledgeAll?: () => void;
  /** Alarm IDs currently being acknowledged. */
  acknowledgingAlarmIds?: ReadonlySet<string>;
  /** True while an acknowledge-all request is in progress. */
  acknowledgingAll?: boolean;
}

type AlarmSortKey =
  | 'datetime'
  | 'priority'
  | 'equipmentId'
  | 'alarmCode'
  | 'description'
  | 'value'
  | 'state';
type SortDirection = 'asc' | 'desc';

interface AlarmSort {
  key: AlarmSortKey;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function priorityClass(priority: string): string {
  switch (priority.toUpperCase()) {
    case 'HIGH':
      return 'm8m-alarm-priority--high';
    case 'MEDIUM':
      return 'm8m-alarm-priority--medium';
    case 'LOW':
      return 'm8m-alarm-priority--low';
    default:
      return 'm8m-alarm-priority--default';
  }
}

function alarmStateClass(state: string): string {
  switch (state.toUpperCase()) {
    case 'ACT UNACK':
      return 'm8m-alarmbar__row--act-unack';
    case 'ACT ACK':
      return 'm8m-alarmbar__row--act-ack';
    case 'RCV UNACK':
      return 'm8m-alarmbar__row--rcv-unack';
    default:
      return '';
  }
}

const alarmCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareAlarms(left: M8mAlarm, right: M8mAlarm, key: AlarmSortKey): number {
  if (key === 'datetime') {
    const leftTimestamp = left.sortTimestamp ?? Date.parse(left.datetime);
    const rightTimestamp = right.sortTimestamp ?? Date.parse(right.datetime);
    if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp)) {
      return leftTimestamp - rightTimestamp;
    }
  }

  if (key === 'priority' || key === 'value') {
    const leftNumber = Number(left[key]);
    const rightNumber = Number(right[key]);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }
  }

  return alarmCollator.compare(left[key], right[key]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function M8mAlarmBar({
  variant = 'footer',
  alarms = [],
  loading = false,
  error,
  onAcknowledgeAlarm,
  onAcknowledgeAll,
  acknowledgingAlarmIds = new Set(),
  acknowledgingAll = false,
}: M8mAlarmBarProps) {
  const [sort, setSort] = useState<AlarmSort>({ key: 'datetime', direction: 'desc' });
  const acknowledgeableCount = alarms.filter((alarm) => alarm.acknowledgeable).length;
  const Container = variant === 'page' ? 'section' : 'footer';
  const sortedAlarms = useMemo(
    () =>
      alarms
        .map((alarm, index) => ({ alarm, index }))
        .sort((left, right) => {
          const comparison = compareAlarms(left.alarm, right.alarm, sort.key);
          return comparison === 0
            ? left.index - right.index
            : comparison * (sort.direction === 'asc' ? 1 : -1);
        })
        .map(({ alarm }) => alarm),
    [alarms, sort],
  );

  const handleSort = (key: AlarmSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortHeader = (label: string, key: AlarmSortKey) => {
    const isActive = sort.key === key;
    const ariaSort = isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <th aria-sort={ariaSort}>
        <button
          className="m8m-alarmbar__sort-button"
          type="button"
          onClick={() => handleSort(key)}
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <span className="m8m-alarmbar__sort-indicator" aria-hidden="true">
            {isActive ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  const handleDoubleClick = (alarm: M8mAlarm) => {
    if (
      !alarm.acknowledgeable ||
      acknowledgingAll ||
      acknowledgingAlarmIds.has(alarm.id)
    ) {
      return;
    }
    onAcknowledgeAlarm?.(alarm);
  };

  return (
    <Container
      className={`m8m-alarmbar${variant === 'page' ? ' m8m-alarmbar--page' : ''}`}
      aria-label="Unresolved alarms"
    >
      <div className="m8m-alarmbar__wrapper">
        <table className="m8m-alarmbar__table">
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '33%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              {sortHeader('Datetime', 'datetime')}
              {sortHeader('Priority', 'priority')}
              {sortHeader('Equipment ID', 'equipmentId')}
              {sortHeader('Alarm Code', 'alarmCode')}
              {sortHeader('Description', 'description')}
              {sortHeader('Value', 'value')}
              {sortHeader('State', 'state')}
            </tr>
          </thead>
          <tbody>
            {alarms.length === 0 ? (
              <tr>
                <td colSpan={7} className="m8m-alarmbar__empty">
                  {loading ? 'Loading unresolved alarms...' : 'No unresolved alarms'}
                </td>
              </tr>
            ) : (
              sortedAlarms.map((alarm) => {
                const isAcknowledging = acknowledgingAlarmIds.has(alarm.id);
                return (
                  <tr
                    key={alarm.id}
                    className={[
                      alarmStateClass(alarm.state),
                      alarm.acknowledgeable ? 'm8m-alarmbar__row--acknowledgeable' : '',
                      isAcknowledging ? 'm8m-alarmbar__row--acknowledging' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={
                      alarm.acknowledgeable
                        ? 'Double-click to acknowledge this alarm'
                        : 'Alarm acknowledged'
                    }
                    tabIndex={alarm.acknowledgeable ? 0 : undefined}
                    onDoubleClick={() => handleDoubleClick(alarm)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleDoubleClick(alarm);
                      }
                    }}
                  >
                    <td>{alarm.datetime}</td>
                    <td>
                      <span className={`m8m-alarm-priority ${priorityClass(alarm.priority)}`}>
                        {alarm.priority}
                      </span>
                    </td>
                    <td>{alarm.equipmentId}</td>
                    <td>{alarm.alarmCode}</td>
                    <td>{alarm.description}</td>
                    <td>{alarm.value}</td>
                    <td>{isAcknowledging ? 'ACKNOWLEDGING' : alarm.state}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="m8m-alarmbar__toolbar">
        <div className="m8m-alarmbar__summary">
          <span>UNRESOLVED ALARMS</span>
          <span className="m8m-alarmbar__count">{alarms.length}</span>
          {error && <span className="m8m-alarmbar__error">{error}</span>}
        </div>
        {onAcknowledgeAll && (
          <button
            className="m8m-alarmbar__ack-all"
            type="button"
            disabled={
              acknowledgeableCount === 0 || acknowledgingAll || acknowledgingAlarmIds.size > 0
            }
            onClick={onAcknowledgeAll}
          >
            {acknowledgingAll
              ? 'ACKNOWLEDGING...'
              : `ACKNOWLEDGE ALL (${acknowledgeableCount})`}
          </button>
        )}
      </div>
    </Container>
  );
}

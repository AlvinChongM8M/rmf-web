import './M8mAlarmBar.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface M8mAlarm {
  /** Unique identifier for React key prop */
  id: string;
  datetime: string;
  /** Severity or priority label supplied by the application. */
  priority: string;
  equipmentId: string;
  description: string;
  value: string;
  /** "ACTIVE" | "ACKNOWLEDGED" | "CLEARED" or any custom string */
  state: string;
  /** Whether this alarm may currently be acknowledged. */
  acknowledgeable?: boolean;
}

export interface M8mAlarmBarProps {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function M8mAlarmBar({
  alarms = [],
  loading = false,
  error,
  onAcknowledgeAlarm,
  onAcknowledgeAll,
  acknowledgingAlarmIds = new Set(),
  acknowledgingAll = false,
}: M8mAlarmBarProps) {
  const acknowledgeableCount = alarms.filter((alarm) => alarm.acknowledgeable).length;

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
    <footer className="m8m-alarmbar" aria-label="Unresolved alarms">
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
      <div className="m8m-alarmbar__wrapper">
        <table className="m8m-alarmbar__table">
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '40%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Datetime</th>
              <th>Priority</th>
              <th>Equipment ID</th>
              <th>Description</th>
              <th>Value</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {alarms.length === 0 ? (
              <tr>
                <td colSpan={6} className="m8m-alarmbar__empty">
                  {loading ? 'Loading unresolved alarms...' : 'No unresolved alarms'}
                </td>
              </tr>
            ) : (
              alarms.map((alarm) => {
                const isAcknowledging = acknowledgingAlarmIds.has(alarm.id);
                return (
                  <tr
                    key={alarm.id}
                    className={[
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
    </footer>
  );
}

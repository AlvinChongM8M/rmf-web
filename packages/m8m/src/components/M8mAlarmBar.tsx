import './M8mAlarmBar.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface M8mAlarm {
  /** Unique identifier for React key prop */
  id: string;
  datetime: string;
  /** "HIGH" | "MEDIUM" | "LOW" or any custom string */
  priority: string;
  equipmentId: string;
  description: string;
  value: string;
  /** "ACTIVE" | "ACKNOWLEDGED" | "CLEARED" or any custom string */
  state: string;
}

export interface M8mAlarmBarProps {
  /** List of active alarms to display. Defaults to empty (shows placeholder row). */
  alarms?: M8mAlarm[];
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
    default:
      return 'm8m-alarm-priority--low';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function M8mAlarmBar({ alarms = [] }: M8mAlarmBarProps) {
  return (
    <footer className="m8m-alarmbar" aria-label="Active alarms">
      <div className="m8m-alarmbar__wrapper">
        <table className="m8m-alarmbar__table">
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '46%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '7%' }} />
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
                  No active alarms
                </td>
              </tr>
            ) : (
              alarms.map((alarm) => (
                <tr key={alarm.id}>
                  <td>{alarm.datetime}</td>
                  <td>
                    <span className={`m8m-alarm-priority ${priorityClass(alarm.priority)}`}>
                      {alarm.priority}
                    </span>
                  </td>
                  <td>{alarm.equipmentId}</td>
                  <td>{alarm.description}</td>
                  <td>{alarm.value}</td>
                  <td>{alarm.state}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </footer>
  );
}

export type AtasAlarmState =
  | 'active_unacknowledged'
  | 'active_acknowledged'
  | 'recovered_unacknowledged'
  | 'recovered_acknowledged'
  | 'lost_track';

export interface AtasAlarmEvent {
  id: number;
  source: string;
  alarm_group: string;
  alarm_code: string;
  alarm_name: string;
  alarm_severity: number;
  alarm_description: string;
  recovery_action: string;
  value: number;
  activation_time: string;
  acknowledge_time?: string | null;
  acknowledged_by?: string | null;
  acknowledge_comment?: string | null;
  recover_time?: string | null;
  lost_time?: string | null;
  state: AtasAlarmState;
}

export interface AtasAlarmListResponse {
  items: AtasAlarmEvent[];
  limit: number;
  offset: number;
}

const ALARM_STATE_LABELS: Record<AtasAlarmState, string> = {
  active_unacknowledged: 'ACT UNACK',
  active_acknowledged: 'ACT ACK',
  recovered_unacknowledged: 'RCV UNACK',
  recovered_acknowledged: 'RCV ACK',
  lost_track: 'LOST TRACK',
};

export function formatAlarmDate(value?: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (part: number, length = 2) => String(part).padStart(length, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
    pad(date.getMilliseconds(), 3)
  );
}

export function alarmTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function alarmStateLabel(state: AtasAlarmState): string {
  return ALARM_STATE_LABELS[state];
}

export function alarmEquipmentId(event: AtasAlarmEvent): string {
  return `${event.source}.${event.alarm_code}`;
}

export function formatAlarmDuration(durationMillis: number): string {
  const totalMillis = Math.max(0, Math.floor(durationMillis));
  const totalSeconds = Math.floor(totalMillis / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = totalMillis % 1000;
  const pad = (part: number, length = 2) => String(part).padStart(length, '0');
  return `${pad(days, 3)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
}

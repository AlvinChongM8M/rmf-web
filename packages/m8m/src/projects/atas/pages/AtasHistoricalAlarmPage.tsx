import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  alarmEquipmentId,
  alarmStateLabel,
  alarmTimestamp,
  type AtasAlarmEvent,
  type AtasAlarmListResponse,
  formatAlarmDate,
  formatAlarmDuration,
} from '../atas-alarm-utils';
import '../styles/AtasHistoricalAlarmPage.css';

type HistoricalAlarmSortKey =
  | 'activationTime'
  | 'recoverTime'
  | 'acknowledgeTime'
  | 'duration'
  | 'priority'
  | 'equipmentId'
  | 'alarmCode'
  | 'description'
  | 'value'
  | 'state';

interface HistoricalAlarmSort {
  key: HistoricalAlarmSortKey;
  direction: 'asc' | 'desc';
}

interface HistoricalAlarmRow {
  event: AtasAlarmEvent;
  activationTimestamp: number | null;
  recoverTimestamp: number | null;
  acknowledgeTimestamp: number | null;
  durationMillis: number | null;
  equipmentId: string;
  state: string;
}

interface AtasHistoricalAlarmPageProps {
  serverUrl: string;
  refreshIntervalMs?: number;
  recordLimit?: number;
}

const alarmCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function responseError(response: Response): Error {
  return new Error(`Loading historical alarms failed (${response.status} ${response.statusText})`);
}

function rowSortValue(
  row: HistoricalAlarmRow,
  key: HistoricalAlarmSortKey,
): string | number | null {
  switch (key) {
    case 'activationTime':
      return row.activationTimestamp;
    case 'recoverTime':
      return row.recoverTimestamp;
    case 'acknowledgeTime':
      return row.acknowledgeTimestamp;
    case 'duration':
      return row.durationMillis;
    case 'priority':
      return row.event.alarm_severity;
    case 'equipmentId':
      return row.equipmentId;
    case 'alarmCode':
      return row.event.alarm_code;
    case 'description':
      return row.event.alarm_name;
    case 'value':
      return row.event.value;
    case 'state':
      return row.state;
  }
}

function compareRows(
  left: HistoricalAlarmRow,
  right: HistoricalAlarmRow,
  sort: HistoricalAlarmSort,
): number {
  const leftValue = rowSortValue(left, sort.key);
  const rightValue = rowSortValue(right, sort.key);

  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;

  const comparison =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : alarmCollator.compare(String(leftValue), String(rightValue));
  return comparison * (sort.direction === 'asc' ? 1 : -1);
}

function stateClass(state: string): string {
  switch (state) {
    case 'ACT UNACK':
      return 'atas-history-state--act-unack';
    case 'ACT ACK':
      return 'atas-history-state--act-ack';
    case 'RCV UNACK':
      return 'atas-history-state--rcv-unack';
    default:
      return '';
  }
}

export function AtasHistoricalAlarmPage({
  serverUrl,
  refreshIntervalMs = 5000,
  recordLimit = 1000,
}: AtasHistoricalAlarmPageProps): JSX.Element {
  const normalizedServerUrl = useMemo(() => serverUrl.replace(/\/$/, ''), [serverUrl]);
  const normalizedRecordLimit = Math.min(1000, Math.max(1, Math.trunc(recordLimit)));
  const [events, setEvents] = useState<AtasAlarmEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<HistoricalAlarmSort>({
    key: 'activationTime',
    direction: 'desc',
  });

  const refreshHistory = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `${normalizedServerUrl}/api/v1/alarm/history?limit=${normalizedRecordLimit}&offset=0`,
          { signal },
        );
        if (!response.ok) {
          throw responseError(response);
        }
        const data = (await response.json()) as AtasAlarmListResponse;
        setEvents(data.items);
        setError(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to load historical alarms:', err);
          setError((err as Error).message);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [normalizedRecordLimit, normalizedServerUrl],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refreshHistory(controller.signal);
    const intervalId = window.setInterval(() => {
      void refreshHistory(controller.signal);
    }, refreshIntervalMs);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [refreshHistory, refreshIntervalMs]);

  const rows = useMemo(
    () =>
      events.map<HistoricalAlarmRow>((event) => {
        const activationTimestamp = alarmTimestamp(event.activation_time);
        const recoverTimestamp = alarmTimestamp(event.recover_time);
        return {
          event,
          activationTimestamp,
          recoverTimestamp,
          acknowledgeTimestamp: alarmTimestamp(event.acknowledge_time),
          durationMillis:
            activationTimestamp == null || recoverTimestamp == null
              ? null
              : Math.max(0, recoverTimestamp - activationTimestamp),
          equipmentId: alarmEquipmentId(event),
          state: alarmStateLabel(event.state),
        };
      }),
    [events],
  );

  const sortedRows = useMemo(
    () =>
      rows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          const comparison = compareRows(left.row, right.row, sort);
          return comparison === 0 ? left.index - right.index : comparison;
        })
        .map(({ row }) => row),
    [rows, sort],
  );

  const handleSort = (key: HistoricalAlarmSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortHeader = (label: string, key: HistoricalAlarmSortKey) => {
    const isActive = sort.key === key;
    const ariaSort = isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
    return (
      <th aria-sort={ariaSort}>
        <button
          className="atas-history-sort-button"
          type="button"
          onClick={() => handleSort(key)}
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <span className="atas-history-sort-indicator" aria-hidden="true">
            {isActive ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <section className="atas-history-page" aria-label="Historical alarms">
      <div className="atas-history-table-container">
        <table className="atas-history-table">
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '5%' }} />
          </colgroup>
          <thead>
            <tr>
              {sortHeader('Datetime (Activated)', 'activationTime')}
              {sortHeader('Datetime (Recovered)', 'recoverTime')}
              {sortHeader('Datetime (Acknowledged)', 'acknowledgeTime')}
              {sortHeader('Alarm Duration (DDD:HH:MM:SS.sss)', 'duration')}
              {sortHeader('Priority', 'priority')}
              {sortHeader('Equipment ID', 'equipmentId')}
              {sortHeader('Alarm Code', 'alarmCode')}
              {sortHeader('Description', 'description')}
              {sortHeader('Value', 'value')}
              {sortHeader('State', 'state')}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={10} className="atas-history-empty">
                  {loading ? 'Loading historical alarms...' : 'No historical alarms'}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.event.id}>
                  <td className="atas-history-datetime">
                    {formatAlarmDate(row.event.activation_time)}
                  </td>
                  <td className="atas-history-datetime">
                    {formatAlarmDate(row.event.recover_time)}
                  </td>
                  <td className="atas-history-datetime">
                    {formatAlarmDate(row.event.acknowledge_time)}
                  </td>
                  <td className="atas-history-duration">
                    {row.durationMillis == null ? '' : formatAlarmDuration(row.durationMillis)}
                  </td>
                  <td>{row.event.alarm_severity}</td>
                  <td>{row.equipmentId}</td>
                  <td>{row.event.alarm_code}</td>
                  <td>{row.event.alarm_name}</td>
                  <td>{row.event.value}</td>
                  <td className={`atas-history-state ${stateClass(row.state)}`}>{row.state}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="atas-history-summary">
        <span>HISTORICAL ALARMS</span>
        <span className="atas-history-count">{events.length}</span>
        {error && <span className="atas-history-error">{error}</span>}
      </div>
    </section>
  );
}

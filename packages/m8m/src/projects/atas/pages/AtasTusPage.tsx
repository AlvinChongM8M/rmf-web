import React from 'react';
import '../styles/AtasTusPage.css';

interface TusNode {
  id: number;
  tss_name: string;
  tus_name: string;
  nickname: string | null;
  role: string | null;
  replenishment_priority: number | null;
  in_operation: boolean;
  presence: boolean | null;
  reserved_task_id: string | null;
  battery_percentage: number | null;
  replenishment_count: number;
  last_update: string;
}

interface TusEvent {
  id: number;
  event_category: string;
  event_name: string;
  tss_name: string | null;
  tus_name: string | null;
  nickname: string | null;
  event_value: string | null;
  timestamp: string;
  source: string;
}

type TusEventSortKey = 'timestamp' | 'tusName' | 'nickname' | 'eventName' | 'value';

interface TusEventSort {
  key: TusEventSortKey;
  direction: 'asc' | 'desc';
}

interface AtasTusPageProps {
  serverUrl: string;
  eventRefreshIntervalMs?: number;
  eventRecordLimit?: number;
}

const tusCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || '-';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return displayText(value);
  }

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function eventSortValue(event: TusEvent, key: TusEventSortKey): string | number {
  switch (key) {
    case 'timestamp': {
      const timestamp = Date.parse(event.timestamp);
      return Number.isNaN(timestamp) ? event.timestamp : timestamp;
    }
    case 'tusName':
      return event.tus_name ?? '';
    case 'nickname':
      return event.nickname ?? '';
    case 'eventName':
      return event.event_name;
    case 'value':
      return event.event_value ?? '';
  }
}

function compareEvents(left: TusEvent, right: TusEvent, sort: TusEventSort): number {
  const leftValue = eventSortValue(left, sort.key);
  const rightValue = eventSortValue(right, sort.key);
  const comparison =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : tusCollator.compare(String(leftValue), String(rightValue));
  return comparison * (sort.direction === 'asc' ? 1 : -1);
}

function isFalseValue(value: string | null): boolean {
  return value?.trim().toLowerCase() === 'false';
}

function emptyDurationMinutes(node: TusNode, events: TusEvent[], now: number): string {
  if (node.presence !== false) {
    return '-';
  }

  const emptyEvent = events.find(
    (event) =>
      event.tus_name === node.tus_name &&
      event.event_name === 'presence_changed' &&
      isFalseValue(event.event_value),
  );
  const emptySince = Date.parse(emptyEvent?.timestamp ?? node.last_update);
  if (Number.isNaN(emptySince) || emptySince > now) {
    return '-';
  }

  return String(Math.floor((now - emptySince) / 60_000));
}

function websocketUrl(serverUrl: string): string {
  const url = new URL(serverUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/api/tus`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function AtasTusPage({
  serverUrl,
  eventRefreshIntervalMs = 5000,
  eventRecordLimit = 1000,
}: AtasTusPageProps): JSX.Element {
  const normalizedServerUrl = React.useMemo(() => serverUrl.replace(/\/$/, ''), [serverUrl]);
  const normalizedEventLimit = Math.min(1000, Math.max(1, Math.trunc(eventRecordLimit)));
  const [tusNodes, setTusNodes] = React.useState<TusNode[]>([]);
  const [events, setEvents] = React.useState<TusEvent[]>([]);
  const [eventsVisible, setEventsVisible] = React.useState(true);
  const [filter, setFilter] = React.useState('');
  const [sort, setSort] = React.useState<TusEventSort>({
    key: 'timestamp',
    direction: 'desc',
  });
  const [now, setNow] = React.useState(() => Date.now());
  const [realtimeError, setRealtimeError] = React.useState<string | null>(null);
  const [eventError, setEventError] = React.useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = React.useState(true);

  React.useEffect(() => {
    let stopped = false;
    let socket: WebSocket | undefined;
    let reconnectTimer: number | undefined;

    const connect = () => {
      try {
        socket = new WebSocket(websocketUrl(normalizedServerUrl));
      } catch (error) {
        setRealtimeError((error as Error).message);
        reconnectTimer = window.setTimeout(connect, 3000);
        return;
      }

      socket.onopen = () => setRealtimeError(null);
      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(String(message.data)) as unknown;
          if (!Array.isArray(data)) {
            throw new Error('Unexpected TUS WebSocket response');
          }
          setTusNodes(data as TusNode[]);
          setRealtimeError(null);
        } catch (error) {
          console.error('Failed to read TUS real-time update:', error);
          setRealtimeError((error as Error).message);
        }
      };
      socket.onerror = () => {
        setRealtimeError('TUS real-time connection failed');
      };
      socket.onclose = () => {
        if (!stopped) {
          setRealtimeError('TUS real-time connection lost; reconnecting…');
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [normalizedServerUrl]);

  React.useEffect(() => {
    const controller = new AbortController();

    const refreshEvents = async () => {
      try {
        const response = await fetch(
          `${normalizedServerUrl}/api/tus-events?limit=${normalizedEventLimit}&offset=0&sort_order=desc`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Loading TUS events failed (${response.status} ${response.statusText})`);
        }
        setEvents((await response.json()) as TusEvent[]);
        setEventError(null);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to load TUS events:', error);
          setEventError((error as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      }
    };

    void refreshEvents();
    const intervalId = window.setInterval(() => void refreshEvents(), eventRefreshIntervalMs);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [eventRefreshIntervalMs, normalizedEventLimit, normalizedServerUrl]);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const sortedTusNodes = React.useMemo(
    () => [...tusNodes].sort((left, right) => tusCollator.compare(left.tus_name, right.tus_name)),
    [tusNodes],
  );

  const filteredEvents = React.useMemo(() => {
    const normalizedFilter = filter.trim().toLocaleLowerCase();
    return events
      .filter((event) => {
        if (!normalizedFilter) {
          return true;
        }
        return [
          formatDateTime(event.timestamp),
          event.tus_name,
          event.nickname,
          event.event_name,
          event.event_value,
        ]
          .map((value) => value ?? '')
          .some((value) => value.toLocaleLowerCase().includes(normalizedFilter));
      })
      .map((event, index) => ({ event, index }))
      .sort((left, right) => {
        const comparison = compareEvents(left.event, right.event, sort);
        return comparison === 0 ? left.index - right.index : comparison;
      })
      .map(({ event }) => event);
  }, [events, filter, sort]);

  const handleSort = (key: TusEventSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortHeader = (label: string, key: TusEventSortKey) => {
    const active = sort.key === key;
    return (
      <th aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button
          className="atas-tus-sort-button"
          type="button"
          onClick={() => handleSort(key)}
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <span className="atas-tus-sort-indicator" aria-hidden="true">
            {active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <section
      className={`atas-tus-page${eventsVisible ? '' : ' atas-tus-page--events-hidden'}`}
      aria-label="TUS monitoring"
    >
      <div className="atas-tus-content">
        <section className="atas-tus-panel atas-tus-status-panel">
          <div className="atas-tus-panel-titlebar">
            <h2>TUS REAL-TIME STATUS</h2>
            <span className="atas-tus-record-count">{tusNodes.length}</span>
          </div>
          {realtimeError && <div className="atas-tus-message atas-tus-message--error">{realtimeError}</div>}
          <div className="atas-tus-table-wrapper">
            <table className="atas-tus-table atas-tus-status-table">
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>TUS ID</th>
                  <th>Nickname</th>
                  <th>Battery (%)</th>
                  <th>Tub Present State</th>
                  <th>Reserved State</th>
                  <th>Empty Duration (minutes)</th>
                  <th>Replenishment Count</th>
                </tr>
              </thead>
              <tbody>
                {sortedTusNodes.length === 0 ? (
                  <tr>
                    <td className="atas-tus-empty" colSpan={7}>
                      {realtimeError ? 'No TUS real-time data available' : 'Waiting for TUS real-time data…'}
                    </td>
                  </tr>
                ) : (
                  sortedTusNodes.map((node) => (
                    <tr key={node.id}>
                      <td className="atas-tus-id">{node.tus_name}</td>
                      <td>{displayText(node.nickname)}</td>
                      <td>{node.battery_percentage == null ? '-' : `${node.battery_percentage}%`}</td>
                      <td>
                        <span className={`atas-tus-state atas-tus-state--${node.presence === true ? 'yes' : 'no'}`}>
                          {node.presence == null ? '-' : node.presence ? 'TRUE' : 'FALSE'}
                        </span>
                      </td>
                      <td>{node.reserved_task_id ? 'RESERVED' : 'NOT RESERVED'}</td>
                      <td>{emptyDurationMinutes(node, events, now)}</td>
                      <td>{node.replenishment_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {eventsVisible && (
          <section id="atas-tus-event-log" className="atas-tus-panel atas-tus-events-panel">
            <div className="atas-tus-panel-titlebar atas-tus-events-titlebar">
              <div className="atas-tus-title-group">
                <h2>TUS EVENT LOG</h2>
                <span className="atas-tus-record-count">{filteredEvents.length}</span>
              </div>
              <label className="atas-tus-filter">
                <span>Filter</span>
                <input
                  type="search"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Search events"
                  aria-label="Filter TUS event log"
                />
              </label>
            </div>
            {eventError && <div className="atas-tus-message atas-tus-message--error">{eventError}</div>}
            <div className="atas-tus-table-wrapper">
              <table className="atas-tus-table atas-tus-event-table">
                <colgroup>
                  <col style={{ width: '27%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead>
                  <tr>
                    {sortHeader('Datetime', 'timestamp')}
                    {sortHeader('TUS ID', 'tusName')}
                    {sortHeader('Nickname', 'nickname')}
                    {sortHeader('Event Name', 'eventName')}
                    {sortHeader('Value', 'value')}
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td className="atas-tus-empty" colSpan={5}>
                        {eventsLoading
                          ? 'Loading TUS events…'
                          : filter
                            ? 'No TUS events match the filter'
                            : 'No TUS events available'}
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((event) => (
                      <tr key={event.id}>
                        <td className="atas-tus-datetime">{formatDateTime(event.timestamp)}</td>
                        <td className="atas-tus-id">{displayText(event.tus_name)}</td>
                        <td>{displayText(event.nickname)}</td>
                        <td>{displayText(event.event_name)}</td>
                        <td>{displayText(event.event_value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <button
        className="atas-tus-log-toggle"
        type="button"
        onClick={() => setEventsVisible((visible) => !visible)}
        aria-expanded={eventsVisible}
        aria-controls="atas-tus-event-log"
      >
        <span>{eventsVisible ? 'HIDE LOG' : 'SHOW LOG'}</span>
      </button>
    </section>
  );
}

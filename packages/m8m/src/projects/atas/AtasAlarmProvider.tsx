import React from 'react';

import type { M8mAlarm } from '../../components/M8mAlarmBar';
import {
  alarmEquipmentId,
  alarmStateLabel,
  alarmTimestamp,
  type AtasAlarmEvent,
  type AtasAlarmListResponse,
  formatAlarmDate,
} from './atas-alarm-utils';

interface AtasAlarmContextValue {
  alarms: M8mAlarm[];
  loading: boolean;
  error: string | null;
  acknowledgingAlarmIds: ReadonlySet<string>;
  acknowledgingAll: boolean;
  acknowledgeAlarm: (alarm: M8mAlarm) => void;
  acknowledgeAll: () => void;
}

interface AtasAlarmProviderProps {
  serverUrl: string;
  username: string;
  refreshIntervalMs?: number;
  recordLimit?: number;
  children: React.ReactNode;
}

const AtasAlarmContext = React.createContext<AtasAlarmContextValue | null>(null);

function toM8mAlarm(event: AtasAlarmEvent): M8mAlarm {
  return {
    id: String(event.id),
    datetime: formatAlarmDate(event.activation_time),
    sortTimestamp: alarmTimestamp(event.activation_time) ?? undefined,
    priority: String(event.alarm_severity),
    equipmentId: alarmEquipmentId(event),
    alarmCode: event.alarm_code,
    description: `${event.alarm_name}`,
    value: String(event.value),
    state: alarmStateLabel(event.state),
    acknowledgeable: event.acknowledge_time == null,
  };
}

function responseError(response: Response, action: string): Error {
  return new Error(`${action} failed (${response.status} ${response.statusText})`);
}

export function AtasAlarmProvider({
  serverUrl,
  username,
  refreshIntervalMs = 5000,
  recordLimit = 1000,
  children,
}: AtasAlarmProviderProps): JSX.Element {
  const normalizedServerUrl = React.useMemo(() => serverUrl.replace(/\/$/, ''), [serverUrl]);
  const normalizedRecordLimit = Math.min(1000, Math.max(1, Math.trunc(recordLimit)));
  const [alarms, setAlarms] = React.useState<M8mAlarm[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [acknowledgingAlarmIds, setAcknowledgingAlarmIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [acknowledgingAll, setAcknowledgingAll] = React.useState(false);

  const refreshAlarms = React.useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `${normalizedServerUrl}/api/v1/alarm/unresolved?limit=${normalizedRecordLimit}`,
          { signal },
        );
        if (!response.ok) {
          throw responseError(response, 'Loading unresolved alarms');
        }
        const data = (await response.json()) as AtasAlarmListResponse;
        setAlarms(data.items.map(toM8mAlarm));
        setError(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to load unresolved alarms:', err);
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

  React.useEffect(() => {
    const controller = new AbortController();
    void refreshAlarms(controller.signal);
    const intervalId = window.setInterval(() => {
      void refreshAlarms(controller.signal);
    }, refreshIntervalMs);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [refreshAlarms, refreshIntervalMs]);

  const postAcknowledgement = React.useCallback(
    async (alarmId: string) => {
      const response = await fetch(`${normalizedServerUrl}/api/v1/alarm/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: Number(alarmId), user: username }),
      });
      if (!response.ok) {
        throw responseError(response, `Acknowledging alarm ${alarmId}`);
      }
    },
    [normalizedServerUrl, username],
  );

  const acknowledgeAlarm = React.useCallback(
    (alarm: M8mAlarm) => {
      if (!alarm.acknowledgeable || acknowledgingAlarmIds.has(alarm.id)) {
        return;
      }

      setAcknowledgingAlarmIds((current) => new Set(current).add(alarm.id));
      void (async () => {
        try {
          await postAcknowledgement(alarm.id);
          await refreshAlarms();
        } catch (err) {
          console.error('Failed to acknowledge alarm:', err);
          setError((err as Error).message);
        } finally {
          setAcknowledgingAlarmIds((current) => {
            const next = new Set(current);
            next.delete(alarm.id);
            return next;
          });
        }
      })();
    },
    [acknowledgingAlarmIds, postAcknowledgement, refreshAlarms],
  );

  const acknowledgeAll = React.useCallback(() => {
    const alarmIds = alarms.filter((alarm) => alarm.acknowledgeable).map((alarm) => alarm.id);
    if (alarmIds.length === 0 || acknowledgingAll || acknowledgingAlarmIds.size > 0) {
      return;
    }

    setAcknowledgingAll(true);
    setAcknowledgingAlarmIds(new Set(alarmIds));
    void (async () => {
      try {
        const results = await Promise.allSettled(alarmIds.map(postAcknowledgement));
        const failedCount = results.filter((result) => result.status === 'rejected').length;
        await refreshAlarms();
        setError(
          failedCount > 0
            ? `Failed to acknowledge ${failedCount} of ${alarmIds.length} alarms`
            : null,
        );
      } catch (err) {
        console.error('Failed to refresh alarms after acknowledgement:', err);
        setError((err as Error).message);
      } finally {
        setAcknowledgingAlarmIds(new Set());
        setAcknowledgingAll(false);
      }
    })();
  }, [
    acknowledgingAlarmIds,
    acknowledgingAll,
    alarms,
    postAcknowledgement,
    refreshAlarms,
  ]);

  const value = React.useMemo<AtasAlarmContextValue>(
    () => ({
      alarms,
      loading,
      error,
      acknowledgingAlarmIds,
      acknowledgingAll,
      acknowledgeAlarm,
      acknowledgeAll,
    }),
    [
      acknowledgeAlarm,
      acknowledgeAll,
      acknowledgingAlarmIds,
      acknowledgingAll,
      alarms,
      error,
      loading,
    ],
  );

  return <AtasAlarmContext.Provider value={value}>{children}</AtasAlarmContext.Provider>;
}

export function useAtasAlarms(): AtasAlarmContextValue {
  const context = React.useContext(AtasAlarmContext);
  if (!context) {
    throw new Error('useAtasAlarms must be used within an AtasAlarmProvider');
  }
  return context;
}

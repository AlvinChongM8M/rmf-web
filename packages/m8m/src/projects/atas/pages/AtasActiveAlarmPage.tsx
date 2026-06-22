import { M8mAlarmBar } from '../../../components/M8mAlarmBar';
import { useAtasAlarms } from '../AtasAlarmProvider';

export function AtasActiveAlarmPage(): JSX.Element {
  const {
    alarms,
    loading,
    error,
    acknowledgeAlarm,
    acknowledgeAll,
    acknowledgingAlarmIds,
    acknowledgingAll,
  } = useAtasAlarms();

  return (
    <M8mAlarmBar
      variant="page"
      alarms={alarms}
      loading={loading}
      error={error}
      onAcknowledgeAlarm={acknowledgeAlarm}
      onAcknowledgeAll={acknowledgeAll}
      acknowledgingAlarmIds={acknowledgingAlarmIds}
      acknowledgingAll={acknowledgingAll}
    />
  );
}

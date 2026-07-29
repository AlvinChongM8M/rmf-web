import { ApiServerModelsRmfApiRobotStateStatus as Status } from 'api-client';

export interface AtasAmrStatusStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  mapColor: string;
  mapOutlineColor?: string;
}

export function getAtasAmrStatusStyle(status?: Status | null): AtasAmrStatusStyle {
  switch (status) {
    case Status.Working:
      return {
        backgroundColor: '#22c55e',
        textColor: '#fff',
        borderColor: '#16a34a',
        mapColor: '#22c55e',
        mapOutlineColor: '#004f1d',
      };
    case Status.Charging:
      return {
        backgroundColor: '#00f0ff',
        textColor: '#000000',
        borderColor: '#1500ffd7',
        mapColor: '#00b3ff',
        mapOutlineColor: '#1500ffd7',
      };
    case Status.Error:
      return {
        backgroundColor: '#ef4444',
        textColor: '#fff',
        borderColor: '#dc2626',
        mapColor: '#ef4444',
        mapOutlineColor: '#dc2626',
      };
    case Status.Offline:
    case Status.Uninitialized:
      return {
        backgroundColor: '#6b7280',
        textColor: '#fff',
        borderColor: '#4b5563',
        mapColor: '#6b7280',
        mapOutlineColor: '#4b5563',
      };
    case Status.Idle:
      return {
        backgroundColor: '#fff',
        textColor: '#111827',
        borderColor: '#9ca3af',
        mapColor: '#fff',
        mapOutlineColor: '#111827',
      };
    case Status.Shutdown:
      return {
        backgroundColor: '#111827',
        textColor: '#fff',
        borderColor: '#374151',
        mapColor: '#111827',
        mapOutlineColor: '#374151',
      };
    default:
      return {
        backgroundColor: '#f59e0b',
        textColor: '#111827',
        borderColor: '#d97706',
        mapColor: '#f59e0b',
        mapOutlineColor: '#d97706',
      };
  }
}

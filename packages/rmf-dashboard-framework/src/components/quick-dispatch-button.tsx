import { Button, ButtonProps } from '@mui/material';
import { TaskRequest } from 'api-client';
import React from 'react';

import { useAppController, useRmfApi } from '../hooks';
import { AppEvents } from './app-events';
import { dispatchTask } from './tasks';

export interface QuickDispatchButtonProps {
  /**
   * Label shown on the button.
   */
  label: string;

  /**
   * The pre-configured task request to dispatch when the button is clicked.
   */
  taskRequest: TaskRequest;

  /**
   * MUI Button color. Defaults to 'secondary'.
   */
  color?: ButtonProps['color'];

  /**
   * MUI Button variant. Defaults to 'contained'.
   */
  variant?: ButtonProps['variant'];
}

/**
 * A button that dispatches a pre-configured task request when clicked.
 * Intended to be used as a `tabActions` element on a `DashboardTab`.
 *
 * Example:
 * ```tsx
 * tabActions: (
 *   <QuickDispatchButton
 *     label="Dispatch Arrival"
 *     taskRequest={{ category: 'patrol', description: { places: ['arrival_gate'] }, unix_millis_earliest_start_time: 0 }}
 *   />
 * )
 * ```
 */
export function QuickDispatchButton({
  label,
  taskRequest,
  color = 'secondary',
  variant = 'contained',
}: QuickDispatchButtonProps) {
  const rmfApi = useRmfApi();
  const { showAlert } = useAppController();
  const [dispatching, setDispatching] = React.useState(false);

  const handleClick = async () => {
    setDispatching(true);
    try {
      await dispatchTask(rmfApi, taskRequest, null);
      AppEvents.refreshTaskApp.next();
      showAlert('success', `Task "${label}" dispatched successfully`);
    } catch (e) {
      showAlert('error', `Failed to dispatch task "${label}": ${(e as Error).message}`);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <Button color={color} variant={variant} disabled={dispatching} onClick={handleClick}>
      {dispatching ? 'Dispatching...' : label}
    </Button>
  );
}

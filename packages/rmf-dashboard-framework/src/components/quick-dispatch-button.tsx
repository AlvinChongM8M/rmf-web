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
   *
   * To target a specific fleet, set `fleet_name` directly on the task request:
   * ```tsx
   * taskRequest={{ ..., fleet_name: 'fleet_A' }}
   * ```
   * RMF will then pick a robot within that fleet automatically.
   */
  taskRequest: TaskRequest;

  /**
   * Dispatch directly to a specific robot.
   * When provided, uses the robot task dispatch endpoint instead of the
   * standard dispatch endpoint. `fleet` is required alongside `robot`
   * because the robot task API needs both.
   *
   * ```tsx
   * robotTarget={{ fleet: 'fleet_A', robot: 'robot_1' }}
   * ```
   */
  robotTarget?: { fleet: string; robot: string };

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
 * Examples:
 * ```tsx
 * // Automatic — RMF picks any robot
 * <QuickDispatchButton label="Patrol" taskRequest={{ category: 'patrol', ... }} />
 *
 * // Fleet — set fleet_name in taskRequest; RMF picks a robot within that fleet
 * <QuickDispatchButton label="Patrol" taskRequest={{ category: 'patrol', ..., fleet_name: 'fleet_A' }} />
 *
 * // Robot — dispatched directly to a specific robot
 * <QuickDispatchButton label="Patrol" taskRequest={{ category: 'patrol', ... }} robotTarget={{ fleet: 'fleet_A', robot: 'robot_1' }} />
 * ```
 */
export function QuickDispatchButton({
  label,
  taskRequest,
  robotTarget,
  color = 'secondary',
  variant = 'contained',
}: QuickDispatchButtonProps) {
  const rmfApi = useRmfApi();
  const { showAlert } = useAppController();
  const [dispatching, setDispatching] = React.useState(false);

  const handleClick = async () => {
    setDispatching(true);
    try {
      await dispatchTask(rmfApi, taskRequest, robotTarget ?? null);
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

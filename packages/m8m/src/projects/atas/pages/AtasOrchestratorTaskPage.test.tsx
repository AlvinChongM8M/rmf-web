import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AppControllerProvider,
  AuthenticatorProvider,
  type AppController,
} from 'rmf-dashboard-framework/hooks';
import { StubAuthenticator } from 'rmf-dashboard-framework/services';

import { AtasOrchestratorTaskPage, type OrchestratorTask } from './AtasOrchestratorTaskPage';

const SERVER_URL = 'http://orchestrator.test';

function makeTask(overrides: Partial<OrchestratorTask> = {}): OrchestratorTask {
  return {
    id: '7d57e65b-bf4b-455c-b60c-9c65da7b77f2',
    task_number: 42,
    display_id: 'ATAS-000042',
    status: 'RECOVERY_REQUIRED',
    priority: 2,
    created_at: '2026-09-15T09:55:00+08:00',
    started_at: '2026-09-15T10:00:00+08:00',
    finished_at: null,
    source_tss_name: 'TSS-A',
    source_tus_name: 'TUS-001',
    source_nickname: 'Source Rack',
    source_waypoint_name: 'source-waypoint',
    destination_tss_name: 'TSS-B',
    destination_tus_name: 'TUS-002',
    destination_nickname: 'Destination Rack',
    destination_waypoint_name: 'destination-waypoint',
    assigned_robot_name: 'AMR-01',
    assigned_fleet_name: 'fleet-a',
    rmf_state: { status: 'canceled' },
    pickup_completed_at: '2026-09-15T10:05:00+08:00',
    placement_completed_at: null,
    cleanup_status: 'RECOVERY_REQUIRED',
    remark: 'Awaiting physical verification',
    cancel_requested: true,
    recovery_resolved: false,
    ...overrides,
  };
}

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 202 ? 'Accepted' : status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function taskListResponse(tasks: OrchestratorTask[]): Response {
  return mockResponse({ total: tasks.length, items: tasks });
}

function renderPage(tasks: OrchestratorTask[]) {
  const authenticator = new StubAuthenticator();
  const showAlert = vi.fn<AppController['showAlert']>();
  const appController: AppController = {
    updateSettings: vi.fn(),
    showAlert,
    setExtraAppbarItems: vi.fn(),
  };

  render(
    <AuthenticatorProvider value={authenticator}>
      <AppControllerProvider value={appController}>
        <AtasOrchestratorTaskPage serverUrl={SERVER_URL} refreshIntervalMs={60_000} />
      </AppControllerProvider>
    </AuthenticatorProvider>,
  );

  return { authenticator, showAlert };
}

async function openRecoveryDialog(): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: 'Resolve recovery' }));
}

async function completeRecoveryForm(optionName: RegExp): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('radio', { name: optionName }));
  await user.type(
    screen.getByRole('textbox', { name: /Verification remark/ }),
    'Physically verified by operator',
  );
  await user.click(
    screen.getByRole('checkbox', {
      name: 'I have physically checked the robot and both TUS locations.',
    }),
  );
}

describe('AtasOrchestratorTaskPage recovery actions', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows task creation time and keeps the duration column hidden', async () => {
    const task = makeTask();
    fetchMock.mockResolvedValueOnce(taskListResponse([task]));

    renderPage([task]);

    expect(await screen.findByRole('columnheader', { name: /Created Time/ })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: /Duration/ })).toBeNull();

    const taskRow = screen.getByText('ATAS-000042').closest('tr');
    expect(taskRow).not.toBeNull();
    const timeCells = taskRow!.querySelectorAll('.atas-orchestrator-task-time');
    expect(timeCells).toHaveLength(3);
    expect(timeCells[0].textContent).not.toBe('-');
    expect(timeCells[0].textContent).not.toBe(timeCells[1].textContent);
  });

  it('shows Resolve recovery only for RECOVERY_REQUIRED and removes its Cancel action', async () => {
    const recoveryTask = makeTask();
    const normalTask = makeTask({
      id: 'normal-task-id',
      task_number: 43,
      display_id: 'ATAS-000043',
      status: 'EXECUTING',
      cancel_requested: false,
      recovery_resolved: false,
      cleanup_status: null,
    });
    fetchMock.mockResolvedValueOnce(taskListResponse([recoveryTask, normalTask]));

    renderPage([recoveryTask, normalTask]);

    const recoveryRow = (await screen.findByText('ATAS-000042')).closest('tr');
    const normalRow = screen.getByText('ATAS-000043').closest('tr');
    expect(recoveryRow).not.toBeNull();
    expect(normalRow).not.toBeNull();
    expect(within(recoveryRow!).getByRole('button', { name: 'Resolve recovery' })).toBeTruthy();
    expect(within(recoveryRow!).queryByRole('button', { name: 'Cancel Task' })).toBeNull();
    expect(within(normalRow!).getByRole('button', { name: 'Cancel Task' })).toBeTruthy();
    expect(within(normalRow!).queryByRole('button', { name: 'Resolve recovery' })).toBeNull();
  });

  it('shows recovery details with no option selected initially', async () => {
    const task = makeTask();
    fetchMock.mockResolvedValueOnce(taskListResponse([task]));
    renderPage([task]);

    await openRecoveryDialog();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('TUS-001 — Source Rack')).toBeTruthy();
    expect(within(dialog).getByText('TUS-002 — Destination Rack')).toBeTruthy();
    expect(within(dialog).getByText('AMR-01')).toBeTruthy();
    expect(within(dialog).getByText('fleet-a')).toBeTruthy();
    expect(within(dialog).getByText('Awaiting physical verification')).toBeTruthy();
    const safeRelease = screen.getByRole('radio', {
      name: /Delivery not completed — release resources/,
    }) as HTMLInputElement;
    const placementCompleted = screen.getByRole('radio', {
      name: /Delivery completed — release TUS reservations/,
    }) as HTMLInputElement;
    expect(safeRelease.checked).toBe(false);
    expect(placementCompleted.checked).toBe(false);
  });

  it('requires an outcome, remark, and physical verification before confirmation', async () => {
    const task = makeTask();
    fetchMock.mockResolvedValueOnce(taskListResponse([task]));
    renderPage([task]);
    const user = userEvent.setup();

    await openRecoveryDialog();
    const confirmButton = screen.getByRole('button', {
      name: 'Confirm recovery',
    }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    await user.click(
      screen.getByRole('radio', { name: /Delivery not completed — release resources/ }),
    );
    expect(confirmButton.disabled).toBe(true);

    await user.type(
      screen.getByRole('textbox', { name: /Verification remark/ }),
      'Checked locations',
    );
    expect(confirmButton.disabled).toBe(true);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'I have physically checked the robot and both TUS locations.',
      }),
    );
    expect(confirmButton.disabled).toBe(false);
  });

  it.each([
    {
      optionName: /Delivery not completed — release resources/,
      disposition: 'safe_to_release',
    },
    {
      optionName: /Delivery completed — release TUS reservations/,
      disposition: 'placement_completed',
    },
  ])(
    'submits the $disposition disposition by internal UUID and refreshes after HTTP 202',
    async ({ optionName, disposition }) => {
      const task = makeTask();
      const processingTask = makeTask({
        status: disposition === 'safe_to_release' ? 'CANCELLED' : 'COMPLETED',
        cleanup_status: 'PROCESSING',
        recovery_resolved: true,
      });
      fetchMock
        .mockResolvedValueOnce(taskListResponse([task]))
        .mockResolvedValueOnce(mockResponse(null, 202))
        .mockResolvedValueOnce(taskListResponse([processingTask]));
      const { showAlert } = renderPage([task]);

      await openRecoveryDialog();
      await completeRecoveryForm(optionName);
      await userEvent.click(screen.getByRole('button', { name: 'Confirm recovery' }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      const [requestUrl, requestInit] = fetchMock.mock.calls[1];
      expect(String(requestUrl)).toBe(
        `${SERVER_URL}/api/v1/tasks/${encodeURIComponent(task.id)}/recovery`,
      );
      expect(requestInit?.method).toBe('POST');
      expect(JSON.parse(String(requestInit?.body))).toEqual({
        disposition,
        remark: 'Physically verified by operator',
      });
      expect(new Headers(requestInit?.headers).get('Authorization')).toMatch(/^Bearer /);
      expect(await screen.findByText('Recovery processing')).toBeTruthy();
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Confirm recovery' })).toBeNull(),
      );
      expect(showAlert).toHaveBeenCalledWith(
        'success',
        'Recovery resolution accepted for ATAS-000042',
      );
    },
  );

  it('handles HTTP 409 by keeping the dialog open and refreshing the task row', async () => {
    const task = makeTask();
    const noLongerEligibleTask = makeTask({
      status: 'CANCELLED',
      cleanup_status: 'COMPLETE',
      recovery_resolved: true,
    });
    fetchMock
      .mockResolvedValueOnce(taskListResponse([task]))
      .mockResolvedValueOnce(mockResponse({ detail: 'Recovery was already resolved.' }, 409))
      .mockResolvedValueOnce(taskListResponse([noLongerEligibleTask]));
    renderPage([task]);

    await openRecoveryDialog();
    await completeRecoveryForm(/Delivery not completed — release resources/);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm recovery' }));

    expect(await screen.findByText(/no longer eligible for recovery/)).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(await screen.findByText('CANCELLED')).toBeTruthy();
  });

  it('uses authentication handling for HTTP 401 and leaves the dialog open', async () => {
    const task = makeTask();
    fetchMock
      .mockResolvedValueOnce(taskListResponse([task]))
      .mockResolvedValueOnce(mockResponse({ detail: 'Token expired.' }, 401));
    const { authenticator } = renderPage([task]);
    const logout = vi.spyOn(authenticator, 'logout').mockResolvedValue(undefined as never);

    await openRecoveryDialog();
    await completeRecoveryForm(/Delivery not completed — release resources/);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm recovery' }));

    expect(await screen.findByText(/Authentication is required/)).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('keeps the modal open and reports other API errors', async () => {
    const task = makeTask();
    fetchMock
      .mockResolvedValueOnce(taskListResponse([task]))
      .mockResolvedValueOnce(mockResponse({ detail: 'Cleanup service unavailable.' }, 503));
    const { showAlert } = renderPage([task]);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await openRecoveryDialog();
    await completeRecoveryForm(/Delivery completed — release TUS reservations/);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm recovery' }));

    expect(await screen.findByText(/Cleanup service unavailable/)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(showAlert).toHaveBeenCalledWith(
      'error',
      'Failed to resolve recovery: Cleanup service unavailable.',
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it('prevents duplicate recovery submissions while the first request is pending', async () => {
    const task = makeTask();
    let resolveSubmission: (response: Response) => void = () => {};
    const pendingSubmission = new Promise<Response>((resolve) => {
      resolveSubmission = resolve;
    });
    fetchMock
      .mockResolvedValueOnce(taskListResponse([task]))
      .mockImplementationOnce(() => pendingSubmission)
      .mockResolvedValueOnce(
        taskListResponse([
          makeTask({
            status: 'CANCELLED',
            cleanup_status: 'PROCESSING',
            recovery_resolved: true,
          }),
        ]),
      );
    renderPage([task]);

    await openRecoveryDialog();
    await completeRecoveryForm(/Delivery not completed — release resources/);
    const confirmButton = screen.getByRole('button', { name: 'Confirm recovery' });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Submitting…')).toBeTruthy();
    resolveSubmission(mockResponse(null, 202));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
});

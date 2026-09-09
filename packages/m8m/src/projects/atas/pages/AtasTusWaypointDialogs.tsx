import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import React from 'react';
import type { TusNodeConfiguration } from './AtasTusNodeEditDialog';

export interface TusRmfWaypointConfiguration {
  id: number;
  tus_node_id: number;
  tss_name: string;
  tus_name: string;
  nickname: string | null;
  waypoint_name: string;
  action: string | null;
  enabled: boolean;
}

type WaypointDialogMode = 'add' | 'edit';

interface WaypointFormDialogProps {
  mode: WaypointDialogMode | null;
  waypoint: TusRmfWaypointConfiguration | null;
  nodes: TusNodeConfiguration[];
  serverUrl: string;
  onClose: () => void;
  onSaved: (waypoint: TusRmfWaypointConfiguration, mode: WaypointDialogMode) => void;
}

interface WaypointDeleteDialogProps {
  waypoint: TusRmfWaypointConfiguration | null;
  serverUrl: string;
  onClose: () => void;
  onDeleted: (waypointId: number) => void;
}

interface WaypointForm {
  tusNodeId: string;
  waypointName: string;
  action: string;
  enabled: boolean;
}

interface WaypointWriteRequest {
  tus_node_id: number;
  waypoint_name: string;
  action: string | null;
  enabled: boolean;
}

const EMPTY_FORM: WaypointForm = {
  tusNodeId: '',
  waypointName: '',
  action: '',
  enabled: true,
};

function displayText(value: string | null): string {
  return value?.trim() || '-';
}

function formFromWaypoint(waypoint: TusRmfWaypointConfiguration): WaypointForm {
  return {
    tusNodeId: String(waypoint.tus_node_id),
    waypointName: waypoint.waypoint_name,
    action: waypoint.action ?? '',
    enabled: waypoint.enabled,
  };
}

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as {
      detail?: string | Array<{ msg?: string }>;
    };
    const detail = Array.isArray(body.detail)
      ? body.detail.map((item) => item.msg).filter(Boolean).join('; ')
      : body.detail;
    if (detail) {
      return new Error(detail);
    }
  } catch {
    // Use the HTTP status fallback when the response body is not JSON.
  }
  return new Error('Request failed (' + response.status + ' ' + response.statusText + ')');
}

function WaypointDetails({
  waypoint,
}: {
  waypoint: TusRmfWaypointConfiguration;
}): JSX.Element {
  return (
    <div className="atas-configuration-dialog-grid">
      <TextField label="Mapping ID" value={waypoint.id} InputProps={{ readOnly: true }} />
      <TextField label="Node ID" value={waypoint.tus_node_id} InputProps={{ readOnly: true }} />
      <TextField label="TSS Name" value={waypoint.tss_name} InputProps={{ readOnly: true }} />
      <TextField label="TUS ID" value={waypoint.tus_name} InputProps={{ readOnly: true }} />
      <TextField
        label="Nickname"
        value={displayText(waypoint.nickname)}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="RMF Waypoint"
        value={waypoint.waypoint_name}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="Waypoint Action"
        value={displayText(waypoint.action)}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="Enabled"
        value={waypoint.enabled ? 'Yes' : 'No'}
        InputProps={{ readOnly: true }}
      />
    </div>
  );
}

export function AtasTusWaypointFormDialog({
  mode,
  waypoint,
  nodes,
  serverUrl,
  onClose,
  onSaved,
}: WaypointFormDialogProps): JSX.Element {
  const [form, setForm] = React.useState<WaypointForm>(EMPTY_FORM);
  const [pendingRequest, setPendingRequest] = React.useState<WaypointWriteRequest | null>(null);
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!mode) {
      return;
    }
    setForm(
      mode === 'edit' && waypoint
        ? formFromWaypoint(waypoint)
        : { ...EMPTY_FORM, tusNodeId: nodes[0] ? String(nodes[0].id) : '' },
    );
    setPendingRequest(null);
    setConfirmationOpen(false);
    setSubmitting(false);
    setError(null);
  }, [mode, waypoint]);

  React.useEffect(() => {
    if (mode === 'add' && !form.tusNodeId && nodes[0]) {
      setForm((current) => ({ ...current, tusNodeId: String(nodes[0].id) }));
    }
  }, [form.tusNodeId, mode, nodes]);

  const updateForm = <K extends keyof WaypointForm>(
    key: K,
    value: WaypointForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const closeDialog = () => {
    if (!submitting) {
      setConfirmationOpen(false);
      setPendingRequest(null);
      setError(null);
      onClose();
    }
  };

  const requestSave = (event: React.FormEvent) => {
    event.preventDefault();
    const tusNodeId = Number(form.tusNodeId);
    if (!Number.isInteger(tusNodeId) || tusNodeId <= 0) {
      setError('Select a valid TUS node.');
      return;
    }
    const waypointName = form.waypointName.trim();
    if (!waypointName) {
      setError('RMF Waypoint is required.');
      return;
    }

    setPendingRequest({
      tus_node_id: tusNodeId,
      waypoint_name: waypointName,
      action: form.action.trim() || null,
      enabled: form.enabled,
    });
    setError(null);
    setConfirmationOpen(true);
  };

  const saveWaypoint = async () => {
    if (!mode || !pendingRequest) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const normalizedServerUrl = serverUrl.replace(/\/$/, '');
      const editing = mode === 'edit';
      const response = await fetch(
        editing
          ? normalizedServerUrl + '/api/tus-rmf-waypoints/' + waypoint?.id
          : normalizedServerUrl + '/api/tus-rmf-waypoints',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingRequest),
        },
      );
      if (!response.ok) {
        throw await responseError(response);
      }

      const savedWaypoint = (await response.json()) as TusRmfWaypointConfiguration;
      setConfirmationOpen(false);
      onSaved(savedWaypoint, mode);
      onClose();
    } catch (saveError) {
      console.error('Failed to save TUS RMF waypoint:', saveError);
      setConfirmationOpen(false);
      setError((saveError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const editing = mode === 'edit';
  return (
    <>
      <Dialog open={mode !== null} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={requestSave}>
          <DialogTitle>{editing ? 'Edit RMF Waypoint' : 'Add RMF Waypoint'}</DialogTitle>
          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <div className="atas-configuration-dialog-grid">
              {editing && waypoint ? (
                <>
                  <TextField
                    label="Mapping ID"
                    value={waypoint.id}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="Node ID"
                    value={waypoint.tus_node_id}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="TSS Name"
                    value={waypoint.tss_name}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="TUS ID"
                    value={waypoint.tus_name}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="Nickname"
                    value={displayText(waypoint.nickname)}
                    InputProps={{ readOnly: true }}
                  />
                </>
              ) : (
                <TextField
                  select
                  required
                  label="TUS Node"
                  value={form.tusNodeId}
                  onChange={(event) => updateForm('tusNodeId', event.target.value)}
                  sx={{ gridColumn: '1 / -1' }}
                >
                  {nodes.map((node) => (
                    <MenuItem key={node.id} value={String(node.id)}>
                      {node.tss_name} / {node.tus_name} — {displayText(node.nickname)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                required
                label="RMF Waypoint"
                value={form.waypointName}
                onChange={(event) => updateForm('waypointName', event.target.value)}
                inputProps={{ maxLength: 150 }}
              />
              <TextField
                label="Waypoint Action"
                value={form.action}
                onChange={(event) => updateForm('action', event.target.value)}
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                select
                label="Enabled"
                value={form.enabled ? 'yes' : 'no'}
                onChange={(event) => updateForm('enabled', event.target.value === 'yes')}
              >
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
            </div>
          </DialogContent>
          <DialogActions>
            <Button type="button" variant="outlined" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              {editing ? 'Save' : 'Add Waypoint'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={confirmationOpen}
        onClose={() => {
          if (!submitting) {
            setConfirmationOpen(false);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{editing ? 'Confirm Waypoint Update' : 'Confirm Add Waypoint'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {editing
              ? 'Save the changes to this RMF waypoint mapping?'
              : 'Add this RMF waypoint mapping?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            disabled={submitting}
            onClick={() => setConfirmationOpen(false)}
          >
            Back
          </Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={() => void saveWaypoint()}
          >
            {submitting ? 'Saving…' : editing ? 'Confirm Save' : 'Confirm Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function AtasTusWaypointDeleteDialog({
  waypoint,
  serverUrl,
  onClose,
  onDeleted,
}: WaypointDeleteDialogProps): JSX.Element {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSubmitting(false);
    setError(null);
  }, [waypoint]);

  const closeDialog = () => {
    if (!submitting) {
      setError(null);
      onClose();
    }
  };

  const deleteWaypoint = async () => {
    if (!waypoint) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        serverUrl.replace(/\/$/, '') + '/api/tus-rmf-waypoints/' + waypoint.id,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        throw await responseError(response);
      }
      onDeleted(waypoint.id);
      onClose();
    } catch (deleteError) {
      console.error('Failed to delete TUS RMF waypoint:', deleteError);
      setError((deleteError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={waypoint !== null} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle>Delete RMF Waypoint</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText sx={{ mb: 2 }}>
          Review the mapping below. This action cannot be undone.
        </DialogContentText>
        {waypoint && <WaypointDetails waypoint={waypoint} />}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" disabled={submitting} onClick={closeDialog}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={submitting}
          onClick={() => void deleteWaypoint()}
        >
          {submitting ? 'Deleting…' : 'Confirm Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

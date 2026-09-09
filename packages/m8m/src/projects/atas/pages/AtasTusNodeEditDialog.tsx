import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';

export interface TusNodeConfiguration {
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

interface TusNodeUpdateRequest {
  nickname: string | null;
  role: string | null;
  replenishment_priority: number | null;
  in_operation: boolean;
  reserved_task_id: string | null;
  replenishment_count: number;
}

interface TusNodeEditForm {
  nickname: string;
  role: string;
  replenishmentPriority: string;
  inOperation: boolean;
  reservedTaskId: string;
  replenishmentCount: string;
}

interface AtasTusNodeEditDialogProps {
  node: TusNodeConfiguration | null;
  serverUrl: string;
  onClose: () => void;
  onSaved: (node: TusNodeConfiguration) => void;
}

const EMPTY_FORM: TusNodeEditForm = {
  nickname: '',
  role: '',
  replenishmentPriority: '',
  inOperation: false,
  reservedTaskId: '',
  replenishmentCount: '0',
};

function formFromNode(node: TusNodeConfiguration): TusNodeEditForm {
  return {
    nickname: node.nickname ?? '',
    role: node.role ?? '',
    replenishmentPriority:
      node.replenishment_priority == null ? '' : String(node.replenishment_priority),
    inOperation: node.in_operation,
    reservedTaskId: node.reserved_task_id ?? '',
    replenishmentCount: String(node.replenishment_count),
  };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function optionalNonNegativeInteger(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(label + ' must be a non-negative whole number.');
  }
  return parsed;
}

function requiredNonNegativeInteger(value: string, label: string): number {
  const parsed = optionalNonNegativeInteger(value, label);
  if (parsed == null) {
    throw new Error(label + ' is required.');
  }
  return parsed;
}

function booleanLabel(value: boolean | null): string {
  if (value == null) {
    return 'Unknown';
  }
  return value ? 'Yes' : 'No';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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
  return new Error('Update failed (' + response.status + ' ' + response.statusText + ')');
}

export function AtasTusNodeEditDialog({
  node,
  serverUrl,
  onClose,
  onSaved,
}: AtasTusNodeEditDialogProps): JSX.Element {
  const [form, setForm] = React.useState<TusNodeEditForm>(EMPTY_FORM);
  const [pendingUpdate, setPendingUpdate] = React.useState<TusNodeUpdateRequest | null>(null);
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (node) {
      setForm(formFromNode(node));
      setPendingUpdate(null);
      setConfirmationOpen(false);
      setSubmitting(false);
      setError(null);
    }
  }, [node]);

  const updateForm = <K extends keyof TusNodeEditForm>(
    key: K,
    value: TusNodeEditForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const closeEditDialog = () => {
    if (!submitting) {
      setConfirmationOpen(false);
      setPendingUpdate(null);
      setError(null);
      onClose();
    }
  };

  const requestSave = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setPendingUpdate({
        nickname: nullableText(form.nickname),
        role: nullableText(form.role),
        replenishment_priority: optionalNonNegativeInteger(
          form.replenishmentPriority,
          'Replenishment priority',
        ),
        in_operation: form.inOperation,
        reserved_task_id: nullableText(form.reservedTaskId),
        replenishment_count: requiredNonNegativeInteger(
          form.replenishmentCount,
          'Replenishment count',
        ),
      });
      setError(null);
      setConfirmationOpen(true);
    } catch (validationError) {
      setError((validationError as Error).message);
    }
  };

  const saveNode = async () => {
    if (!node || !pendingUpdate) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(serverUrl.replace(/\/$/, '') + '/api/tus/' + node.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingUpdate),
      });
      if (!response.ok) {
        throw await responseError(response);
      }

      const updatedNode = (await response.json()) as TusNodeConfiguration;
      setConfirmationOpen(false);
      onSaved(updatedNode);
      onClose();
    } catch (saveError) {
      console.error('Failed to update TUS node:', saveError);
      setConfirmationOpen(false);
      setError((saveError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={node !== null} onClose={closeEditDialog} maxWidth="md" fullWidth>
        <form onSubmit={requestSave}>
          <DialogTitle>Edit TUS Node</DialogTitle>
          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Node details
            </Typography>
            <div className="atas-configuration-dialog-grid">
              <TextField label="Node ID" value={node?.id ?? ''} InputProps={{ readOnly: true }} />
              <TextField
                label="TSS Name"
                value={node?.tss_name ?? ''}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="TUS ID"
                value={node?.tus_name ?? ''}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Tub Present"
                value={node ? booleanLabel(node.presence) : ''}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Battery (%)"
                value={node?.battery_percentage ?? '-'}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Last Update"
                value={node ? formatDateTime(node.last_update) : ''}
                InputProps={{ readOnly: true }}
              />
            </div>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Editable configuration
            </Typography>
            <div className="atas-configuration-dialog-grid">
              <TextField
                label="Nickname"
                value={form.nickname}
                onChange={(event) => updateForm('nickname', event.target.value)}
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                label="Role"
                value={form.role}
                onChange={(event) => updateForm('role', event.target.value)}
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                label="Replenishment Priority"
                type="number"
                value={form.replenishmentPriority}
                onChange={(event) => updateForm('replenishmentPriority', event.target.value)}
                inputProps={{ min: 0, step: 1 }}
                helperText="0 = Disable, 1 = Highest, 255 = Lowest"
              />
              <TextField
                select
                label="In Operation"
                value={form.inOperation ? 'yes' : 'no'}
                onChange={(event) => updateForm('inOperation', event.target.value === 'yes')}
              >
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
              <TextField
                label="Reserved Task ID"
                value={form.reservedTaskId}
                onChange={(event) => updateForm('reservedTaskId', event.target.value)}
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                required
                label="Replenishment Count"
                type="number"
                value={form.replenishmentCount}
                onChange={(event) => updateForm('replenishmentCount', event.target.value)}
                inputProps={{ min: 0, step: 1 }}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button type="button" variant="outlined" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save
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
        <DialogTitle>Confirm TUS Node Update</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Save the changes to {node?.tss_name} / {node?.tus_name}?
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
          <Button variant="contained" disabled={submitting} onClick={() => void saveNode()}>
            {submitting ? 'Saving…' : 'Confirm Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

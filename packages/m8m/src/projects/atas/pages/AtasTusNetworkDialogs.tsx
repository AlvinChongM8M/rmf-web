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

export interface TusNetworkConfiguration {
  id: number;
  network_name: string;
  from_tus_node_id: number;
  from_tss_name?: string;
  from_tus_name?: string;
  from_nickname?: string | null;
  to_tus_node_id: number;
  to_tss_name?: string;
  to_tus_name?: string;
  to_nickname?: string | null;
  distance_weight: number;
  enabled: boolean;
}

type NetworkDialogMode = 'add' | 'edit';

interface NetworkFormDialogProps {
  mode: NetworkDialogMode | null;
  network: TusNetworkConfiguration | null;
  nodes: TusNodeConfiguration[];
  serverUrl: string;
  onClose: () => void;
  onSaved: (network: TusNetworkConfiguration, mode: NetworkDialogMode) => void;
}

interface NetworkDeleteDialogProps {
  network: TusNetworkConfiguration | null;
  nodes: TusNodeConfiguration[];
  serverUrl: string;
  onClose: () => void;
  onDeleted: (networkId: number) => void;
}

interface NetworkForm {
  networkName: string;
  fromTusNodeId: string;
  toTusNodeId: string;
  distanceWeight: string;
  enabled: boolean;
}

interface NetworkWriteRequest {
  network_name: string;
  from_tus_node_id: number;
  to_tus_node_id: number;
  distance_weight: number;
  enabled: boolean;
}

const EMPTY_FORM: NetworkForm = {
  networkName: '',
  fromTusNodeId: '',
  toTusNodeId: '',
  distanceWeight: '1',
  enabled: true,
};

const nodeLabelCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function displayText(value: string | null | undefined): string {
  return value?.trim() || '-';
}

export function tusNodeDisplayLabel(node: TusNodeConfiguration): string {
  return displayText(node.nickname) + ' (' + node.tss_name + ', ' + node.tus_name + ')';
}

export function networkEndpointDisplayLabel(
  network: TusNetworkConfiguration,
  side: 'from' | 'to',
  nodes: TusNodeConfiguration[],
): string {
  const nodeId = side === 'from' ? network.from_tus_node_id : network.to_tus_node_id;
  const nickname = side === 'from' ? network.from_nickname : network.to_nickname;
  const tssName = side === 'from' ? network.from_tss_name : network.to_tss_name;
  const tusName = side === 'from' ? network.from_tus_name : network.to_tus_name;
  if (tssName && tusName) {
    return displayText(nickname) + ' (' + tssName + ', ' + tusName + ')';
  }

  const node = nodes.find((candidate) => candidate.id === nodeId);
  return node ? tusNodeDisplayLabel(node) : 'Node ' + nodeId;
}

function formFromNetwork(network: TusNetworkConfiguration): NetworkForm {
  return {
    networkName: network.network_name,
    fromTusNodeId: String(network.from_tus_node_id),
    toTusNodeId: String(network.to_tus_node_id),
    distanceWeight: String(network.distance_weight),
    enabled: network.enabled,
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

function NetworkDetails({
  network,
  nodes,
}: {
  network: TusNetworkConfiguration;
  nodes: TusNodeConfiguration[];
}): JSX.Element {
  return (
    <div className="atas-configuration-dialog-grid">
      <TextField label="Network ID" value={network.id} InputProps={{ readOnly: true }} />
      <TextField
        label="Network Name"
        value={network.network_name}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="From Node"
        value={networkEndpointDisplayLabel(network, 'from', nodes)}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="To Node"
        value={networkEndpointDisplayLabel(network, 'to', nodes)}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="Distance Weight"
        value={network.distance_weight}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="Enabled"
        value={network.enabled ? 'Yes' : 'No'}
        InputProps={{ readOnly: true }}
      />
    </div>
  );
}

export function AtasTusNetworkFormDialog({
  mode,
  network,
  nodes,
  serverUrl,
  onClose,
  onSaved,
}: NetworkFormDialogProps): JSX.Element {
  const [form, setForm] = React.useState<NetworkForm>(EMPTY_FORM);
  const [pendingRequest, setPendingRequest] = React.useState<NetworkWriteRequest | null>(null);
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sortedNodes = React.useMemo(
    () =>
      [...nodes].sort((left, right) => {
        const comparison = nodeLabelCollator.compare(
          tusNodeDisplayLabel(left),
          tusNodeDisplayLabel(right),
        );
        return comparison === 0 ? left.id - right.id : comparison;
      }),
    [nodes],
  );

  React.useEffect(() => {
    if (!mode) {
      return;
    }
    setForm(
      mode === 'edit' && network
        ? formFromNetwork(network)
        : {
            ...EMPTY_FORM,
            fromTusNodeId: sortedNodes[0] ? String(sortedNodes[0].id) : '',
            toTusNodeId: sortedNodes[1]
              ? String(sortedNodes[1].id)
              : sortedNodes[0]
                ? String(sortedNodes[0].id)
                : '',
          },
    );
    setPendingRequest(null);
    setConfirmationOpen(false);
    setSubmitting(false);
    setError(null);
  }, [mode, network]);

  React.useEffect(() => {
    if (mode !== 'add' || form.fromTusNodeId || !sortedNodes[0]) {
      return;
    }
    setForm((current) => ({
      ...current,
      fromTusNodeId: String(sortedNodes[0].id),
      toTusNodeId: sortedNodes[1]
        ? String(sortedNodes[1].id)
        : String(sortedNodes[0].id),
    }));
  }, [form.fromTusNodeId, mode, sortedNodes]);

  const updateForm = <K extends keyof NetworkForm>(
    key: K,
    value: NetworkForm[K],
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
    const networkName = form.networkName.trim();
    const fromTusNodeId = Number(form.fromTusNodeId);
    const toTusNodeId = Number(form.toTusNodeId);
    const distanceWeight = Number(form.distanceWeight);
    if (!networkName) {
      setError('Network Name is required.');
      return;
    }
    if (!Number.isInteger(fromTusNodeId) || fromTusNodeId <= 0) {
      setError('Select a valid From Node.');
      return;
    }
    if (!Number.isInteger(toTusNodeId) || toTusNodeId <= 0) {
      setError('Select a valid To Node.');
      return;
    }
    if (!Number.isFinite(distanceWeight) || distanceWeight < 0) {
      setError('Distance Weight must be a non-negative number.');
      return;
    }

    setPendingRequest({
      network_name: networkName,
      from_tus_node_id: fromTusNodeId,
      to_tus_node_id: toTusNodeId,
      distance_weight: distanceWeight,
      enabled: form.enabled,
    });
    setError(null);
    setConfirmationOpen(true);
  };

  const saveNetwork = async () => {
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
          ? normalizedServerUrl + '/api/network/' + network?.id
          : normalizedServerUrl + '/api/network',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingRequest),
        },
      );
      if (!response.ok) {
        throw await responseError(response);
      }

      const savedNetwork = (await response.json()) as TusNetworkConfiguration;
      setConfirmationOpen(false);
      onSaved(savedNetwork, mode);
      onClose();
    } catch (saveError) {
      console.error('Failed to save TUS network:', saveError);
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
          <DialogTitle>{editing ? 'Edit TUS Network' : 'Add TUS Network'}</DialogTitle>
          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <div className="atas-configuration-dialog-grid">
              {editing && network && (
                <TextField
                  label="Network ID"
                  value={network.id}
                  InputProps={{ readOnly: true }}
                />
              )}
              <TextField
                required
                label="Network Name"
                value={form.networkName}
                onChange={(event) => updateForm('networkName', event.target.value)}
                inputProps={{ maxLength: 150 }}
              />
              <TextField
                select
                required
                label="From Node"
                value={form.fromTusNodeId}
                onChange={(event) => updateForm('fromTusNodeId', event.target.value)}
              >
                {sortedNodes.map((node) => (
                  <MenuItem key={node.id} value={String(node.id)}>
                    {tusNodeDisplayLabel(node)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                required
                label="To Node"
                value={form.toTusNodeId}
                onChange={(event) => updateForm('toTusNodeId', event.target.value)}
              >
                {sortedNodes.map((node) => (
                  <MenuItem key={node.id} value={String(node.id)}>
                    {tusNodeDisplayLabel(node)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                required
                label="Distance Weight"
                type="number"
                value={form.distanceWeight}
                onChange={(event) => updateForm('distanceWeight', event.target.value)}
                inputProps={{ min: 0, step: 'any' }}
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
              {editing ? 'Save' : 'Add Network'}
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
        <DialogTitle>{editing ? 'Confirm Network Update' : 'Confirm Add Network'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {editing ? 'Save the changes to this network?' : 'Add this TUS network?'}
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
          <Button variant="contained" disabled={submitting} onClick={() => void saveNetwork()}>
            {submitting ? 'Saving…' : editing ? 'Confirm Save' : 'Confirm Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function AtasTusNetworkDeleteDialog({
  network,
  nodes,
  serverUrl,
  onClose,
  onDeleted,
}: NetworkDeleteDialogProps): JSX.Element {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSubmitting(false);
    setError(null);
  }, [network]);

  const closeDialog = () => {
    if (!submitting) {
      setError(null);
      onClose();
    }
  };

  const deleteNetwork = async () => {
    if (!network) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        serverUrl.replace(/\/$/, '') + '/api/network/' + network.id,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        throw await responseError(response);
      }
      onDeleted(network.id);
      onClose();
    } catch (deleteError) {
      console.error('Failed to delete TUS network:', deleteError);
      setError((deleteError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={network !== null} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle>Delete TUS Network</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText sx={{ mb: 2 }}>
          Review the network below. This action cannot be undone.
        </DialogContentText>
        {network && <NetworkDetails network={network} nodes={nodes} />}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" disabled={submitting} onClick={closeDialog}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={submitting}
          onClick={() => void deleteNetwork()}
        >
          {submitting ? 'Deleting…' : 'Confirm Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

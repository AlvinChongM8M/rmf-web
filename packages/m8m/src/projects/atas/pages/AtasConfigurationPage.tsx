import React from 'react';
import {
  AtasTusNodeEditDialog,
  type TusNodeConfiguration,
} from './AtasTusNodeEditDialog';
import {
  AtasTusWaypointDeleteDialog,
  AtasTusWaypointFormDialog,
  type TusRmfWaypointConfiguration,
} from './AtasTusWaypointDialogs';
import '../styles/AtasConfigurationPage.css';

interface TusNetworkConfiguration {
  id: number;
  network_name: string;
  from_tus_node_id: number;
  to_tus_node_id: number;
  distance_weight: number;
  enabled: boolean;
}

interface AtasConfigurationPageProps {
  serverUrl: string;
  refreshIntervalMs?: number;
}

const configurationCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

async function fetchConfiguration<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(
      'Request failed (' + response.status + ' ' + response.statusText + ')',
    );
  }
  return (await response.json()) as T;
}

function optionalText(value: string | number | null): string | number {
  if (typeof value === 'string') {
    return value.trim() || '-';
  }
  return value ?? '-';
}

export function AtasConfigurationPage({
  serverUrl,
  refreshIntervalMs = 5000,
}: AtasConfigurationPageProps): JSX.Element {
  const normalizedServerUrl = React.useMemo(() => serverUrl.replace(/\/$/, ''), [serverUrl]);
  const [nodes, setNodes] = React.useState<TusNodeConfiguration[]>([]);
  const [networks, setNetworks] = React.useState<TusNetworkConfiguration[]>([]);
  const [waypoints, setWaypoints] = React.useState<TusRmfWaypointConfiguration[]>([]);
  const [nodesLoading, setNodesLoading] = React.useState(true);
  const [networksLoading, setNetworksLoading] = React.useState(true);
  const [waypointsLoading, setWaypointsLoading] = React.useState(true);
  const [nodesError, setNodesError] = React.useState<string | null>(null);
  const [networksError, setNetworksError] = React.useState<string | null>(null);
  const [waypointsError, setWaypointsError] = React.useState<string | null>(null);
  const [selectedNode, setSelectedNode] = React.useState<TusNodeConfiguration | null>(null);
  const [nodeUpdateMessage, setNodeUpdateMessage] = React.useState<string | null>(null);
  const [waypointDialogMode, setWaypointDialogMode] = React.useState<'add' | 'edit' | null>(
    null,
  );
  const [selectedWaypoint, setSelectedWaypoint] =
    React.useState<TusRmfWaypointConfiguration | null>(null);
  const [deletingWaypoint, setDeletingWaypoint] =
    React.useState<TusRmfWaypointConfiguration | null>(null);
  const [waypointUpdateMessage, setWaypointUpdateMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    const refreshNodes = async () => {
      try {
        const data = await fetchConfiguration<TusNodeConfiguration[]>(
          normalizedServerUrl + '/api/tus?limit=1000&offset=0',
          controller.signal,
        );
        setNodes(data);
        setNodesError(null);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to load TUS node configuration:', error);
          setNodesError((error as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setNodesLoading(false);
        }
      }
    };

    const refreshNetworks = async () => {
      try {
        const data = await fetchConfiguration<TusNetworkConfiguration[]>(
          normalizedServerUrl + '/api/network?limit=1000&offset=0',
          controller.signal,
        );
        setNetworks(data);
        setNetworksError(null);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to load TUS network configuration:', error);
          setNetworksError((error as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setNetworksLoading(false);
        }
      }
    };

    const refreshWaypoints = async () => {
      try {
        const data = await fetchConfiguration<TusRmfWaypointConfiguration[]>(
          normalizedServerUrl + '/api/tus-rmf-waypoints?limit=1000&offset=0',
          controller.signal,
        );
        setWaypoints(data);
        setWaypointsError(null);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to load TUS RMF waypoint configuration:', error);
          setWaypointsError((error as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setWaypointsLoading(false);
        }
      }
    };

    const refresh = () => {
      void refreshNodes();
      void refreshNetworks();
      void refreshWaypoints();
    };

    refresh();
    const intervalId = window.setInterval(refresh, refreshIntervalMs);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [normalizedServerUrl, refreshIntervalMs]);

  const sortedNodes = React.useMemo(
    () =>
      [...nodes].sort((left, right) =>
        configurationCollator.compare(left.tus_name, right.tus_name),
      ),
    [nodes],
  );
  const sortedNetworks = React.useMemo(
    () => [...networks].sort((left, right) => left.id - right.id),
    [networks],
  );
  const sortedWaypoints = React.useMemo(
    () => [...waypoints].sort((left, right) => left.id - right.id),
    [waypoints],
  );

  return (
    <section className="atas-configuration-page" aria-label="Configuration">
      <section className="atas-configuration-main">
        <h2 className="atas-configuration-main-title">
          Tub Distribution Modal Parameter Settings
        </h2>

        <div className="atas-configuration-grid">
          <div className="atas-configuration-left-stack">
            <section className="atas-configuration-block">
              <div className="atas-configuration-header">
                <h3>TUS Node Configuration</h3>
              </div>
              {nodeUpdateMessage && (
                <div className="atas-configuration-success">{nodeUpdateMessage}</div>
              )}
              {nodesError && (
                <div className="atas-configuration-error">Node configuration: {nodesError}</div>
              )}
              <div className="atas-configuration-table-wrapper">
                <table className="atas-configuration-table">
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '11%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="atas-configuration-compact-column">TSS Name</th>
                      <th className="atas-configuration-compact-column">TUS ID</th>
                      <th>Nickname</th>
                      <th>Role</th>
                      <th className="atas-configuration-priority-column">
                        Replenishment Priority
                        <span>(0 Off · 1 High · 255 Low)</span>
                      </th>
                      <th>In Operation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedNodes.length === 0 ? (
                      <tr>
                        <td className="atas-configuration-empty" colSpan={7}>
                          {nodesLoading ? 'Loading TUS nodes…' : 'No TUS nodes configured'}
                        </td>
                      </tr>
                    ) : (
                      sortedNodes.map((node) => (
                        <tr key={node.id}>
                          <td className="atas-configuration-compact-column">{node.tss_name}</td>
                          <td className="atas-configuration-name atas-configuration-compact-column">
                            {node.tus_name}
                          </td>
                          <td>{optionalText(node.nickname)}</td>
                          <td>{optionalText(node.role)}</td>
                          <td>{optionalText(node.replenishment_priority)}</td>
                          <td>{node.in_operation ? 'Yes' : 'No'}</td>
                          <td>
                            <button
                              className="atas-configuration-edit-button"
                              type="button"
                              onClick={() => {
                                setNodeUpdateMessage(null);
                                setSelectedNode(node);
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="atas-configuration-block">
              <div className="atas-configuration-header">
                <h3>TUS RMF Waypoint Configuration</h3>
                <button
                  className="atas-configuration-action"
                  type="button"
                  onClick={() => {
                    setWaypointUpdateMessage(null);
                    setSelectedWaypoint(null);
                    setWaypointDialogMode('add');
                  }}
                >
                  Add Waypoint
                </button>
              </div>
              {waypointUpdateMessage && (
                <div className="atas-configuration-success">{waypointUpdateMessage}</div>
              )}
              {waypointsError && (
                <div className="atas-configuration-error">
                  RMF waypoint configuration: {waypointsError}
                </div>
              )}
              <div className="atas-configuration-table-wrapper">
                <table className="atas-configuration-table atas-waypoint-table">
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="atas-configuration-compact-column">TSS Name</th>
                      <th className="atas-configuration-compact-column">TUS ID</th>
                      <th>Nickname</th>
                      <th>RMF Waypoint</th>
                      <th>Waypoint Action</th>
                      <th>Enabled</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWaypoints.length === 0 ? (
                      <tr>
                        <td className="atas-configuration-empty" colSpan={7}>
                          {waypointsLoading
                            ? 'Loading TUS RMF waypoints…'
                            : 'No TUS RMF waypoints configured'}
                        </td>
                      </tr>
                    ) : (
                      sortedWaypoints.map((waypoint) => (
                        <tr key={waypoint.id}>
                          <td className="atas-configuration-compact-column">
                            {waypoint.tss_name}
                          </td>
                          <td className="atas-configuration-name atas-configuration-compact-column">
                            {waypoint.tus_name}
                          </td>
                          <td>{optionalText(waypoint.nickname)}</td>
                          <td>{waypoint.waypoint_name}</td>
                          <td>{optionalText(waypoint.action)}</td>
                          <td>{waypoint.enabled ? 'Yes' : 'No'}</td>
                          <td>
                            <div className="atas-configuration-row-actions">
                              <button
                                className="atas-configuration-edit-button"
                                type="button"
                                onClick={() => {
                                  setWaypointUpdateMessage(null);
                                  setSelectedWaypoint(waypoint);
                                  setWaypointDialogMode('edit');
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="atas-configuration-delete-button"
                                type="button"
                                onClick={() => {
                                  setWaypointUpdateMessage(null);
                                  setDeletingWaypoint(waypoint);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="atas-configuration-block">
            <div className="atas-configuration-header">
              <h3>TUS Network Configuration</h3>
              <button className="atas-configuration-action" type="button">
                Configure Network
              </button>
            </div>
            {networksError && (
              <div className="atas-configuration-error">
                Network configuration: {networksError}
              </div>
            )}
            <div className="atas-configuration-table-wrapper">
              <table className="atas-configuration-table">
                <thead>
                  <tr>
                    <th>Network ID</th>
                    <th>
                      From Node
                      <span>(Node ID)</span>
                    </th>
                    <th>
                      To Node
                      <span>(Node ID)</span>
                    </th>
                    <th>
                      Distance
                      <span>(Weight)</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNetworks.length === 0 ? (
                    <tr>
                      <td className="atas-configuration-empty" colSpan={4}>
                        {networksLoading ? 'Loading TUS network…' : 'No TUS network configured'}
                      </td>
                    </tr>
                  ) : (
                    sortedNetworks.map((network) => (
                      <tr key={network.id}>
                        <td>{network.id}</td>
                        <td>{network.from_tus_node_id}</td>
                        <td>{network.to_tus_node_id}</td>
                        <td>{network.distance_weight}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      <aside className="atas-command-center">
        <section className="atas-command-panel">
          <h2>SPECIAL COMMAND CENTER</h2>
          <div className="atas-command-grid">
            <button type="button">NEW TASK</button>
            <button type="button">STOP AMR</button>
            <button type="button">CHARGE AMR</button>
            <button type="button">DIAGNOSIS AMR</button>
            <button type="button">Reset TUS Replenishment Count</button>
            <button type="button">Download Map</button>
            <button type="button">Deploy Map</button>
          </div>
          <p className="atas-command-note">
            * Command functions will be connected in a future update.
          </p>
        </section>
      </aside>

      <AtasTusNodeEditDialog
        node={selectedNode}
        serverUrl={normalizedServerUrl}
        onClose={() => setSelectedNode(null)}
        onSaved={(updatedNode) => {
          setNodes((current) =>
            current.map((node) => (node.id === updatedNode.id ? updatedNode : node)),
          );
          setNodeUpdateMessage(updatedNode.tus_name + ' updated successfully.');
        }}
      />
      <AtasTusWaypointFormDialog
        mode={waypointDialogMode}
        waypoint={selectedWaypoint}
        nodes={sortedNodes}
        serverUrl={normalizedServerUrl}
        onClose={() => {
          setWaypointDialogMode(null);
          setSelectedWaypoint(null);
        }}
        onSaved={(savedWaypoint, mode) => {
          setWaypoints((current) => {
            const exists = current.some((waypoint) => waypoint.id === savedWaypoint.id);
            return exists
              ? current.map((waypoint) =>
                  waypoint.id === savedWaypoint.id ? savedWaypoint : waypoint,
                )
              : [...current, savedWaypoint];
          });
          setWaypointUpdateMessage(
            mode === 'add'
              ? savedWaypoint.waypoint_name + ' added successfully.'
              : savedWaypoint.waypoint_name + ' updated successfully.',
          );
        }}
      />
      <AtasTusWaypointDeleteDialog
        waypoint={deletingWaypoint}
        serverUrl={normalizedServerUrl}
        onClose={() => setDeletingWaypoint(null)}
        onDeleted={(waypointId) => {
          setWaypoints((current) =>
            current.filter((waypoint) => waypoint.id !== waypointId),
          );
          setWaypointUpdateMessage('RMF waypoint deleted successfully.');
        }}
      />
    </section>
  );
}

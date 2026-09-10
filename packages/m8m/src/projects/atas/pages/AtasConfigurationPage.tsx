import React from 'react';
import {
  AtasTusNodeEditDialog,
  type TusNodeConfiguration,
} from './AtasTusNodeEditDialog';
import {
  AtasTusNetworkDeleteDialog,
  AtasTusNetworkFormDialog,
  networkEndpointDisplayLabel,
  type TusNetworkConfiguration,
} from './AtasTusNetworkDialogs';
import {
  AtasTusWaypointDeleteDialog,
  AtasTusWaypointFormDialog,
  type TusRmfWaypointConfiguration,
} from './AtasTusWaypointDialogs';
import '../styles/AtasConfigurationPage.css';

interface AtasConfigurationPageProps {
  serverUrl: string;
  refreshIntervalMs?: number;
}

type SortDirection = 'asc' | 'desc';
type ConfigurationSortValue = string | number | boolean | null | undefined;

type NodeSortKey =
  | 'tssName'
  | 'tusName'
  | 'nickname'
  | 'role'
  | 'replenishmentPriority'
  | 'inOperation';
type WaypointSortKey =
  | 'tssName'
  | 'tusName'
  | 'nickname'
  | 'waypointName'
  | 'waypointAction'
  | 'enabled';
type NetworkSortKey =
  | 'networkId'
  | 'fromNode'
  | 'toNode'
  | 'distanceWeight'
  | 'bidirectional';

interface ConfigurationSort<K> {
  key: K;
  direction: SortDirection;
}

const configurationCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function compareConfigurationValues(
  left: ConfigurationSortValue,
  right: ConfigurationSortValue,
  direction: SortDirection,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  const comparison =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : typeof left === 'boolean' && typeof right === 'boolean'
        ? Number(left) - Number(right)
        : configurationCollator.compare(String(left), String(right));
  return comparison * (direction === 'asc' ? 1 : -1);
}

function nextSort<K>(current: ConfigurationSort<K>, key: K): ConfigurationSort<K> {
  return {
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  };
}

function nodeSortValue(node: TusNodeConfiguration, key: NodeSortKey): ConfigurationSortValue {
  switch (key) {
    case 'tssName':
      return node.tss_name;
    case 'tusName':
      return node.tus_name;
    case 'nickname':
      return node.nickname;
    case 'role':
      return node.role;
    case 'replenishmentPriority':
      return node.replenishment_priority;
    case 'inOperation':
      return node.in_operation;
  }
}

function waypointSortValue(
  waypoint: TusRmfWaypointConfiguration,
  key: WaypointSortKey,
): ConfigurationSortValue {
  switch (key) {
    case 'tssName':
      return waypoint.tss_name;
    case 'tusName':
      return waypoint.tus_name;
    case 'nickname':
      return waypoint.nickname;
    case 'waypointName':
      return waypoint.waypoint_name;
    case 'waypointAction':
      return waypoint.action;
    case 'enabled':
      return waypoint.enabled;
  }
}

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
  const [networkDialogMode, setNetworkDialogMode] = React.useState<'add' | 'edit' | null>(
    null,
  );
  const [selectedNetwork, setSelectedNetwork] =
    React.useState<TusNetworkConfiguration | null>(null);
  const [deletingNetwork, setDeletingNetwork] =
    React.useState<TusNetworkConfiguration | null>(null);
  const [networkUpdateMessage, setNetworkUpdateMessage] = React.useState<string | null>(null);
  const [nodeSort, setNodeSort] = React.useState<ConfigurationSort<NodeSortKey>>({
    key: 'tusName',
    direction: 'asc',
  });
  const [waypointSort, setWaypointSort] = React.useState<ConfigurationSort<WaypointSortKey>>({
    key: 'tssName',
    direction: 'asc',
  });
  const [networkSort, setNetworkSort] = React.useState<ConfigurationSort<NetworkSortKey>>({
    key: 'networkId',
    direction: 'asc',
  });

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
      nodes
        .map((node, index) => ({ node, index }))
        .sort((left, right) => {
          const comparison = compareConfigurationValues(
            nodeSortValue(left.node, nodeSort.key),
            nodeSortValue(right.node, nodeSort.key),
            nodeSort.direction,
          );
          return comparison === 0 ? left.index - right.index : comparison;
        })
        .map(({ node }) => node),
    [nodeSort, nodes],
  );
  const sortedNetworks = React.useMemo(
    () =>
      networks
        .map((network, index) => ({ network, index }))
        .sort((left, right) => {
          const value = (network: TusNetworkConfiguration): ConfigurationSortValue => {
            switch (networkSort.key) {
              case 'networkId':
                return network.id;
              case 'fromNode':
                return networkEndpointDisplayLabel(network, 'from', nodes);
              case 'toNode':
                return networkEndpointDisplayLabel(network, 'to', nodes);
              case 'distanceWeight':
                return network.distance_weight;
              case 'bidirectional':
                return network.bidirectional;
            }
          };
          const comparison = compareConfigurationValues(
            value(left.network),
            value(right.network),
            networkSort.direction,
          );
          return comparison === 0 ? left.index - right.index : comparison;
        })
        .map(({ network }) => network),
    [networkSort, networks, nodes],
  );
  const sortedWaypoints = React.useMemo(
    () =>
      waypoints
        .map((waypoint, index) => ({ waypoint, index }))
        .sort((left, right) => {
          const comparison = compareConfigurationValues(
            waypointSortValue(left.waypoint, waypointSort.key),
            waypointSortValue(right.waypoint, waypointSort.key),
            waypointSort.direction,
          );
          return comparison === 0 ? left.index - right.index : comparison;
        })
        .map(({ waypoint }) => waypoint),
    [waypointSort, waypoints],
  );

  const sortHeader = <K,>(
    label: React.ReactNode,
    accessibleLabel: string,
    key: K,
    sort: ConfigurationSort<K>,
    onSort: React.Dispatch<React.SetStateAction<ConfigurationSort<K>>>,
    className?: string,
  ) => {
    const active = sort.key === key;
    return (
      <th
        className={className}
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          className="atas-configuration-sort-button"
          type="button"
          onClick={() => onSort((current) => nextSort(current, key))}
          title={`Sort by ${accessibleLabel}`}
        >
          <span className="atas-configuration-sort-label">{label}</span>
          <span className="atas-configuration-sort-indicator" aria-hidden="true">
            {active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

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
                      {sortHeader(
                        'TSS Name',
                        'TSS Name',
                        'tssName',
                        nodeSort,
                        setNodeSort,
                        'atas-configuration-compact-column',
                      )}
                      {sortHeader(
                        'TUS ID',
                        'TUS ID',
                        'tusName',
                        nodeSort,
                        setNodeSort,
                        'atas-configuration-compact-column',
                      )}
                      {sortHeader('Nickname', 'Nickname', 'nickname', nodeSort, setNodeSort)}
                      {sortHeader('Role', 'Role', 'role', nodeSort, setNodeSort)}
                      {sortHeader(
                        <>
                          Replenishment Priority
                          <span>(0 Off · 1 High · 255 Low)</span>
                        </>,
                        'Replenishment Priority',
                        'replenishmentPriority',
                        nodeSort,
                        setNodeSort,
                        'atas-configuration-priority-column',
                      )}
                      {sortHeader(
                        'In Operation',
                        'In Operation',
                        'inOperation',
                        nodeSort,
                        setNodeSort,
                      )}
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
                      {sortHeader(
                        'TSS Name',
                        'TSS Name',
                        'tssName',
                        waypointSort,
                        setWaypointSort,
                        'atas-configuration-compact-column',
                      )}
                      {sortHeader(
                        'TUS ID',
                        'TUS ID',
                        'tusName',
                        waypointSort,
                        setWaypointSort,
                        'atas-configuration-compact-column',
                      )}
                      {sortHeader(
                        'Nickname',
                        'Nickname',
                        'nickname',
                        waypointSort,
                        setWaypointSort,
                      )}
                      {sortHeader(
                        'RMF Waypoint',
                        'RMF Waypoint',
                        'waypointName',
                        waypointSort,
                        setWaypointSort,
                      )}
                      {sortHeader(
                        'Waypoint Action',
                        'Waypoint Action',
                        'waypointAction',
                        waypointSort,
                        setWaypointSort,
                      )}
                      {sortHeader(
                        'Enabled',
                        'Enabled',
                        'enabled',
                        waypointSort,
                        setWaypointSort,
                      )}
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
              <button
                className="atas-configuration-action"
                type="button"
                onClick={() => {
                  setNetworkUpdateMessage(null);
                  setSelectedNetwork(null);
                  setNetworkDialogMode('add');
                }}
              >
                Add Network
              </button>
            </div>
            {networkUpdateMessage && (
              <div className="atas-configuration-success">{networkUpdateMessage}</div>
            )}
            {networksError && (
              <div className="atas-configuration-error">
                Network configuration: {networksError}
              </div>
            )}
            <div className="atas-configuration-table-wrapper">
              <table className="atas-configuration-table">
                <colgroup>
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead>
                  <tr>
                    {sortHeader(
                      'Network ID',
                      'Network ID',
                      'networkId',
                      networkSort,
                      setNetworkSort,
                    )}
                    {sortHeader(
                      'From Node',
                      'From Node',
                      'fromNode',
                      networkSort,
                      setNetworkSort,
                    )}
                    {sortHeader(
                      'To Node',
                      'To Node',
                      'toNode',
                      networkSort,
                      setNetworkSort,
                    )}
                    {sortHeader(
                      <>
                        Distance
                        <span>(Weight)</span>
                      </>,
                      'Distance Weight',
                      'distanceWeight',
                      networkSort,
                      setNetworkSort,
                    )}
                    {sortHeader(
                      'Bidirectional',
                      'Bidirectional',
                      'bidirectional',
                      networkSort,
                      setNetworkSort,
                    )}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNetworks.length === 0 ? (
                    <tr>
                      <td className="atas-configuration-empty" colSpan={6}>
                        {networksLoading ? 'Loading TUS network…' : 'No TUS network configured'}
                      </td>
                    </tr>
                  ) : (
                    sortedNetworks.map((network) => (
                      <tr key={network.id}>
                        <td>{network.id}</td>
                        <td
                          title={networkEndpointDisplayLabel(network, 'from', sortedNodes)}
                        >
                          {networkEndpointDisplayLabel(network, 'from', sortedNodes)}
                        </td>
                        <td title={networkEndpointDisplayLabel(network, 'to', sortedNodes)}>
                          {networkEndpointDisplayLabel(network, 'to', sortedNodes)}
                        </td>
                        <td>{network.distance_weight}</td>
                        <td>{network.bidirectional ? 'Yes' : 'No'}</td>
                        <td>
                          <div className="atas-configuration-row-actions">
                            <button
                              className="atas-configuration-edit-button"
                              type="button"
                              onClick={() => {
                                setNetworkUpdateMessage(null);
                                setSelectedNetwork(network);
                                setNetworkDialogMode('edit');
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="atas-configuration-delete-button"
                              type="button"
                              onClick={() => {
                                setNetworkUpdateMessage(null);
                                setDeletingNetwork(network);
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
      <AtasTusNetworkFormDialog
        mode={networkDialogMode}
        network={selectedNetwork}
        nodes={sortedNodes}
        serverUrl={normalizedServerUrl}
        onClose={() => {
          setNetworkDialogMode(null);
          setSelectedNetwork(null);
        }}
        onSaved={(savedNetwork, mode) => {
          setNetworks((current) => {
            const exists = current.some((network) => network.id === savedNetwork.id);
            return exists
              ? current.map((network) =>
                  network.id === savedNetwork.id ? savedNetwork : network,
                )
              : [...current, savedNetwork];
          });
          setNetworkUpdateMessage(
            mode === 'add'
              ? savedNetwork.network_name + ' added successfully.'
              : savedNetwork.network_name + ' updated successfully.',
          );
        }}
      />
      <AtasTusNetworkDeleteDialog
        network={deletingNetwork}
        nodes={sortedNodes}
        serverUrl={normalizedServerUrl}
        onClose={() => setDeletingNetwork(null)}
        onDeleted={(networkId) => {
          setNetworks((current) => current.filter((network) => network.id !== networkId));
          setNetworkUpdateMessage('TUS network deleted successfully.');
        }}
      />
    </section>
  );
}

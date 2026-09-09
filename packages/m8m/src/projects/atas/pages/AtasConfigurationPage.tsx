import React from 'react';
import '../styles/AtasConfigurationPage.css';

interface TusNodeConfiguration {
  id: number;
  tus_name: string;
  role: string | null;
  replenishment_priority: number | null;
  in_operation: boolean;
}

interface TusNetworkConfiguration {
  id: number;
  network_name: string;
  from_tus_node_id: number;
  to_tus_node_id: number;
  distance_weight: number;
  enabled: boolean;
}

interface TusRmfWaypointConfiguration {
  id: number;
  tus_node_id: number;
  tss_name: string;
  tus_name: string;
  nickname: string | null;
  waypoint_name: string;
  action: string | null;
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
                <button className="atas-configuration-action" type="button">
                  Configure Node
                </button>
              </div>
              {nodesError && (
                <div className="atas-configuration-error">Node configuration: {nodesError}</div>
              )}
              <div className="atas-configuration-table-wrapper">
                <table className="atas-configuration-table">
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Node ID</th>
                      <th>Node Name</th>
                      <th>Role</th>
                      <th>
                        Replenishment Priority
                        <span>(0 = Disable, 1 = Highest, 255 = Lowest)</span>
                      </th>
                      <th>
                        In Operation
                        <span>(0 = No, 1 = Yes)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedNodes.length === 0 ? (
                      <tr>
                        <td className="atas-configuration-empty" colSpan={5}>
                          {nodesLoading ? 'Loading TUS nodes…' : 'No TUS nodes configured'}
                        </td>
                      </tr>
                    ) : (
                      sortedNodes.map((node) => (
                        <tr key={node.id}>
                          <td>{node.id}</td>
                          <td className="atas-configuration-name">{node.tus_name}</td>
                          <td>{optionalText(node.role)}</td>
                          <td>{optionalText(node.replenishment_priority)}</td>
                          <td>{node.in_operation ? 1 : 0}</td>
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
                <button className="atas-configuration-action" type="button">
                  Configure Waypoint
                </button>
              </div>
              {waypointsError && (
                <div className="atas-configuration-error">
                  RMF waypoint configuration: {waypointsError}
                </div>
              )}
              <div className="atas-configuration-table-wrapper">
                <table className="atas-configuration-table atas-waypoint-table">
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '21%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Mapping ID</th>
                      <th>TSS Name</th>
                      <th>TUS Name</th>
                      <th>Nickname</th>
                      <th>RMF Waypoint</th>
                      <th>Action</th>
                      <th>Enabled</th>
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
                          <td>{waypoint.id}</td>
                          <td>{waypoint.tss_name}</td>
                          <td className="atas-configuration-name">{waypoint.tus_name}</td>
                          <td>{optionalText(waypoint.nickname)}</td>
                          <td>{waypoint.waypoint_name}</td>
                          <td>{optionalText(waypoint.action)}</td>
                          <td>{waypoint.enabled ? 1 : 0}</td>
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
    </section>
  );
}

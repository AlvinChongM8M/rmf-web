import '../styles/AtasOrchestratorTaskPage.css';

export function AtasOrchestratorTaskPage(): JSX.Element {
  return (
    <section
      className="atas-orchestrator-task-page"
      aria-label="Orchestrator task monitoring"
    >
      <div className="atas-orchestrator-task-placeholder">
        <h2>Task Orchestrator</h2>
        <p>Task data will be displayed here after the orchestrator API is configured.</p>
      </div>
    </section>
  );
}

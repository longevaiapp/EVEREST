function HistoryPanel({ visitHistory, nodes, currentNodeId }) {
  const getNodeLabel = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return nodeId;
    return node.etapa || node.tipo || nodeId;
  };

  return (
    <div className="history-panel">
      <h3>Recorrido del Flujo</h3>
      <div className="history-list">
        {visitHistory.map((nodeId, index) => (
          <div 
            key={`${nodeId}-${index}`}
            className={`history-item ${nodeId === currentNodeId ? 'active' : ''}`}
          >
            <div className="history-number">{index + 1}</div>
            <div className="history-label">{getNodeLabel(nodeId)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryPanel;

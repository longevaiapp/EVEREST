import { useState, useEffect, useCallback, useMemo } from 'react';
import hospitalizacionService from '../../services/hospitalizacion.service';

const AREAS = [
  { key: 'PERROS_NO_INFECCIOSOS', label: 'Hospitalización Perros', icon: '🐕', color: '#3b82f6' },
  { key: 'PERROS_INFECCIOSOS', label: 'Infecciosos Perros', icon: '🐕‍🦺', color: '#ef4444' },
  { key: 'GATOS_NO_INFECCIOSOS', label: 'Hospitalización Gatos', icon: '🐈', color: '#8b5cf6' },
  { key: 'GATOS_INFECCIOSOS', label: 'Infecciosos Gatos', icon: '🐈‍⬛', color: '#f97316' },
  { key: 'MATERNIDAD', label: 'Maternidad / UCI Neo', icon: '🤱', color: '#ec4899' },
];

// Generate time slots from startHour to endHour (visible window)
function generateTimeSlots(startHour = 6, endHour = 22) {
  const slots = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === endHour && m > 0) break;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
}

function HospitalBoard({ onSelectPatient, onOpenFluidCalc }) {
  const [activeArea, setActiveArea] = useState(AREAS[0].key);
  const [boardData, setBoardData] = useState(null);
  const [areaSummary, setAreaSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState({ start: 6, end: 22 });

  const timeSlots = useMemo(() => generateTimeSlots(timeRange.start, timeRange.end), [timeRange]);

  // Current time for the "now" indicator
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const currentSlotIndex = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    return timeSlots.findIndex(slot => {
      const [sh, sm] = slot.split(':').map(Number);
      const nextM = sm + 30;
      const nextH = nextM >= 60 ? sh + 1 : sh;
      const normalizedNextM = nextM % 60;
      const slotStart = sh * 60 + sm;
      const slotEnd = nextH * 60 + normalizedNextM;
      const current = h * 60 + m;
      return current >= slotStart && current < slotEnd;
    });
  }, [now, timeSlots]);

  // Load area summary
  useEffect(() => {
    hospitalizacionService.getBoardSummary()
      .then(res => {
        const data = res?.data || res;
        setAreaSummary(data?.areas || []);
      })
      .catch(err => console.error('Error loading summary:', err));
  }, []);

  // Load board data for selected area
  const loadBoard = useCallback(async (area) => {
    setLoading(true);
    setError(null);
    try {
      const res = await hospitalizacionService.getBoard(area);
      const data = res?.data || res;
      setBoardData(data);
    } catch (err) {
      console.error('Error loading board:', err);
      setError('Error al cargar el tablero');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard(activeArea);
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => loadBoard(activeArea), 120000);
    return () => clearInterval(interval);
  }, [activeArea, loadBoard]);

  // Get area count from summary
  const getAreaCount = (key) => {
    const found = areaSummary.find(a => a.key === key);
    return found?.count || 0;
  };

  // Determine activity cell content
  const getSlotContent = (row, slot) => {
    const activities = row.activities?.[slot];
    if (!activities || activities.length === 0) return null;
    return activities;
  };

  // Format status badge
  const getStatusColor = (status) => {
    switch (status) {
      case 'ADMINISTRADO': return '#22c55e';
      case 'PENDIENTE': return '#eab308';
      case 'OMITIDO': return '#ef4444';
      case 'continuous': return '#3b82f6';
      case 'scheduled': return '#a855f7';
      default: return '#94a3b8';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'medication': return '💊';
      case 'monitoring': return '🩺';
      case 'fluid': return '💧';
      default: return '📋';
    }
  };

  return (
    <div className="hospital-board">
      {/* Area Tabs */}
      <div className="board-area-tabs">
        {AREAS.map(area => (
          <button
            key={area.key}
            className={`board-area-tab ${activeArea === area.key ? 'active' : ''}`}
            onClick={() => setActiveArea(area.key)}
            style={{ '--area-color': area.color }}
          >
            <span className="area-icon">{area.icon}</span>
            <span className="area-label">{area.label}</span>
            <span className="area-count">{getAreaCount(area.key)}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="board-controls">
        <div className="board-time-range">
          <label>Horario:</label>
          <select value={timeRange.start} onChange={(e) => setTimeRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
            ))}
          </select>
          <span>a</span>
          <select value={timeRange.end} onChange={(e) => setTimeRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
        <button className="btn-refresh" onClick={() => loadBoard(activeArea)} disabled={loading}>
          🔄 {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && <div className="board-error">{error}</div>}

      {/* Grid */}
      <div className="board-grid-wrapper">
        {!boardData?.rows?.length ? (
          <div className="board-empty">
            <div className="board-empty-icon">🏥</div>
            <p>No hay pacientes en {AREAS.find(a => a.key === activeArea)?.label || 'esta área'}</p>
          </div>
        ) : (
          <div className="board-grid" style={{ gridTemplateColumns: `200px repeat(${timeSlots.length}, minmax(80px, 1fr))` }}>
            {/* Header row */}
            <div className="board-cell board-header board-patient-col">Paciente</div>
            {timeSlots.map((slot, idx) => (
              <div
                key={slot}
                className={`board-cell board-header board-time-col ${idx === currentSlotIndex ? 'now' : ''}`}
              >
                {slot}
              </div>
            ))}

            {/* Patient rows */}
            {boardData.rows.map((row) => (
              <>
                {/* Patient info cell */}
                <div
                  key={`patient-${row.hospitalizationId}`}
                  className="board-cell board-patient-cell"
                  onClick={() => onSelectPatient && onSelectPatient(row)}
                >
                  <div className="board-pet-name">
                    {row.pet.especie === 'GATO' ? '🐈' : '🐕'} {row.pet.nombre}
                  </div>
                  <div className="board-pet-info">
                    {row.pet.raza} • {row.pet.owner}
                  </div>
                  <div className="board-pet-meta">
                    {row.reason?.substring(0, 40)}
                    {row.hasFluidTherapy && <span className="board-fluid-badge">💧</span>}
                  </div>
                  {onOpenFluidCalc && (
                    <button
                      className="board-fluid-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFluidCalc(row);
                      }}
                    >
                      💧 Fluidos
                    </button>
                  )}
                </div>

                {/* Time slots */}
                {timeSlots.map((slot, idx) => {
                  const activities = getSlotContent(row, slot);
                  return (
                    <div
                      key={`${row.hospitalizationId}-${slot}`}
                      className={`board-cell board-slot ${idx === currentSlotIndex ? 'now-col' : ''} ${activities ? 'has-activity' : ''}`}
                    >
                      {activities && (
                        <div className="board-activities">
                          {activities.map((act, ai) => (
                            <div
                              key={ai}
                              className="board-activity"
                              style={{ '--act-color': getStatusColor(act.status) }}
                              title={`${act.name} ${act.dose || ''} ${act.route || ''}`}
                            >
                              <span className="act-icon">{getActivityIcon(act.type)}</span>
                              <span className="act-name">{act.name?.substring(0, 10)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="board-legend">
        <span className="legend-title">Leyenda:</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#22c55e' }}></span> Administrado</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#eab308' }}></span> Pendiente</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }}></span> Omitido</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }}></span> Fluidos</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#a855f7' }}></span> Monitoreo</span>
      </div>
    </div>
  );
}

export default HospitalBoard;

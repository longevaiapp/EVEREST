import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import './FarmaciaDashboard.css';

function FarmaciaDashboard() {
  const { t } = useTranslation();
  const { currentUser, systemState, completeTask, deliverMedication, addToHistory } = useApp();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [preparingMeds, setPreparingMeds] = useState({});
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMedicationModal, setShowNewMedicationModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);

  const myTasks = systemState.tareasPendientes.FARMACIA || [];
  const pharmacyPatients = systemState.pacientes.filter(p => p.estado === 'EN_FARMACIA');
  
  // Filtros de órdenes
  const pendingOrders = myTasks.filter(t => t.prioridad === 'ALTA' || t.prioridad === 'MEDIA');
  const urgentOrders = myTasks.filter(t => t.prioridad === 'ALTA');
  const completedToday = 18; // Mock data

  const inventory = [
    { id: 1, nombre: 'Amoxicilina 500mg', stock: 150, minimo: 50, categoria: 'Antibióticos', precio: 25.00 },
    { id: 2, nombre: 'Carprofeno 75mg', stock: 80, minimo: 30, categoria: 'Antiinflamatorios', precio: 35.00 },
    { id: 3, nombre: 'Metronidazol 250mg', stock: 45, minimo: 40, categoria: 'Antibióticos', precio: 20.00 },
    { id: 4, nombre: 'Prednisona 5mg', stock: 120, minimo: 50, categoria: 'Corticosteroides', precio: 15.00 },
    { id: 5, nombre: 'Tramadol 50mg', stock: 25, minimo: 30, categoria: 'Analgésicos', precio: 40.00 },
    { id: 6, nombre: 'Doxiciclina 100mg', stock: 90, minimo: 40, categoria: 'Antibióticos', precio: 28.00 },
    { id: 7, nombre: 'Meloxicam 15mg', stock: 15, minimo: 25, categoria: 'Antiinflamatorios', precio: 32.00 },
    { id: 8, nombre: 'Omeprazol 20mg', stock: 110, minimo: 50, categoria: 'Protectores Gástricos', precio: 18.00 },
    { id: 9, nombre: 'Enrofloxacina 150mg', stock: 65, minimo: 30, categoria: 'Antibióticos', precio: 30.00 },
    { id: 10, nombre: 'Vacuna Séxtuple', stock: 30, minimo: 20, categoria: 'Vacunas', precio: 45.00 },
  ];

  // Búsqueda de inventario
  const filteredInventory = inventory.filter(item =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrepare = (taskId, patientId) => {
    setPreparingMeds({ ...preparingMeds, [taskId]: true });
    
    setTimeout(() => {
      completeTask('FARMACIA', taskId);
      deliverMedication(patientId);
      setPreparingMeds({ ...preparingMeds, [taskId]: false });
      alert('Medicamentos preparados y entregados');
    }, 1500);
  };

  const handleViewOrderDetails = (task) => {
    setSelectedOrder(task);
    setShowOrderDetailsModal(true);
  };

  const getLowStockCount = () => {
    return inventory.filter(item => item.stock <= item.minimo).length;
  };

  return (
    <div className="dashboard farmacia-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>💊 {t('roles.FARMACIA')}</h3>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>{t('recepcion.dashboard')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'recetas' ? 'active' : ''}`}
            onClick={() => setActiveSection('recetas')}
          >
            <span className="nav-icon">📝</span>
            <span>{t('farmacia.pendingPrescriptions')}</span>
            {myTasks.length > 0 && (
              <span className="nav-badge">{myTasks.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'inventario' ? 'active' : ''}`}
            onClick={() => setActiveSection('inventario')}
          >
            <span className="nav-icon">📦</span>
            <span>{t('farmacia.inventory')}</span>
            {getLowStockCount() > 0 && (
              <span className="nav-badge urgent">{getLowStockCount()}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'dispensados' ? 'active' : ''}`}
            onClick={() => setActiveSection('dispensados')}
          >
            <span className="nav-icon">✅</span>
            <span>{t('farmacia.dispensed')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'reportes' ? 'active' : ''}`}
            onClick={() => setActiveSection('reportes')}
          >
            <span className="nav-icon">📈</span>
            <span>{t('admin.reports')}</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1>
              {activeSection === 'dashboard' && 'Dashboard Farmacia'}
              {activeSection === 'recetas' && 'Recetas Pendientes'}
              {activeSection === 'inventario' && 'Inventario de Medicamentos'}
              {activeSection === 'dispensados' && 'Medicamentos Dispensados'}
              {activeSection === 'reportes' && 'Reportes y Estadísticas'}
            </h1>
            <p>{currentUser.nombre} - Gestión de Medicamentos</p>
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {activeSection === 'dashboard' && (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#9c27b0'}}>💊</div>
                <div className="stat-content">
                  <h3>{myTasks.length}</h3>
                  <p>Pedidos Pendientes</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#2196f3'}}>📦</div>
                <div className="stat-content">
                  <h3>{inventory.length}</h3>
                  <p>Productos en Inventario</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#f44336'}}>⚠️</div>
                <div className="stat-content">
                  <h3>{getLowStockCount()}</h3>
                  <p>Stock Bajo</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#4caf50'}}>✅</div>
                <div className="stat-content">
                  <h3>{completedToday}</h3>
                  <p>Entregados Hoy</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="content-section">
                <h2>Órdenes Urgentes</h2>
                <div className="orders-list">
                  {urgentOrders.length === 0 ? (
                    <div className="empty-state">No hay órdenes urgentes</div>
                  ) : (
                    urgentOrders.map(task => {
                      const patient = systemState.pacientes.find(p => p.id === task.pacienteId);
                      const isPreparing = preparingMeds[task.id];
                      
                      return (
                        <div key={task.id} className="order-card urgent">
                          <div className="order-header">
                            <div className="order-info">
                              <span className="order-priority urgent">URGENTE</span>
                              <span className="order-time">{new Date(task.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          
                          {patient && (
                            <div className="order-patient">
                              <div className="patient-avatar-small">
                                {patient.especie === 'Perro' ? '🐕' : '🐈'}
                              </div>
                              <div>
                                <h4>{patient.nombre}</h4>
                                <p>{patient.propietario} • {patient.numeroFicha}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="order-medications">
                            <strong>Medicamentos:</strong>
                            <p>{task.descripcion}</p>
                          </div>
                          
                          <div className="order-actions">
                            <button 
                              className="btn-secondary"
                              onClick={() => handleViewOrderDetails(task)}
                            >
                              Ver Detalles
                            </button>
                            <button 
                              className={`btn-prepare ${isPreparing ? 'preparing' : ''}`}
                              onClick={() => handlePrepare(task.id, task.pacienteId)}
                              disabled={isPreparing}
                            >
                              {isPreparing ? '⏳ Preparando...' : '📦 Preparar'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="content-section">
                <h2>Alertas de Stock</h2>
                <div className="alerts-list">
                  {inventory.filter(item => item.stock <= item.minimo).map(item => (
                    <div key={item.id} className="alert-card">
                      <div className="alert-icon">⚠️</div>
                      <div className="alert-content">
                        <h4>{item.nombre}</h4>
                        <p>Stock actual: <strong>{item.stock}</strong> unidades (Mínimo: {item.minimo})</p>
                        <span className="alert-category">{item.categoria}</span>
                      </div>
                      <button className="btn-small">Reabastecer</button>
                    </div>
                  ))}
                  {getLowStockCount() === 0 && (
                    <div className="empty-state">✅ Todos los productos tienen stock suficiente</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* RECETAS PENDIENTES VIEW */}
        {activeSection === 'recetas' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Todas las Órdenes Pendientes</h2>
              <div className="orders-list">
                {myTasks.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay órdenes pendientes</p>
                  </div>
                ) : (
                  myTasks.map(task => {
                    const patient = systemState.pacientes.find(p => p.id === task.pacienteId);
                    const isPreparing = preparingMeds[task.id];
                    
                    return (
                      <div key={task.id} className="order-card">
                        <div className="order-header">
                          <div className="order-info">
                            <span className={`order-priority ${task.prioridad === 'ALTA' ? 'urgent' : ''}`}>
                              {task.prioridad}
                            </span>
                            <span className="order-time">{new Date(task.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        
                        {patient && (
                          <div className="order-patient">
                            <div className="patient-avatar-small">
                              {patient.especie === 'Perro' ? '🐕' : '🐈'}
                            </div>
                            <div>
                              <h4>{patient.nombre}</h4>
                              <p>{patient.propietario} • {patient.numeroFicha}</p>
                              <p className="patient-detail">Tel: <a href={`tel:${patient.telefono}`}>{patient.telefono}</a></p>
                            </div>
                          </div>
                        )}
                        
                        <div className="order-medications">
                          <strong>Medicamentos Prescritos:</strong>
                          <p>{task.descripcion}</p>
                        </div>
                        
                        <div className="order-actions">
                          <button 
                            className="btn-secondary"
                            onClick={() => handleViewOrderDetails(task)}
                          >
                            Ver Detalles Completos
                          </button>
                          <button 
                            className={`btn-prepare ${isPreparing ? 'preparing' : ''}`}
                            onClick={() => handlePrepare(task.id, task.pacienteId)}
                            disabled={isPreparing}
                          >
                            {isPreparing ? '⏳ Preparando...' : '📦 Preparar y Entregar'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* INVENTARIO VIEW */}
        {activeSection === 'inventario' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <div className="section-header">
                <h2>Control de Inventario</h2>
                <div className="section-actions">
                  <div className="search-bar">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Buscar medicamento o categoría..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="btn-clear" onClick={() => setSearchQuery('')}>
                        ✕
                      </button>
                    )}
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={() => setShowNewMedicationModal(true)}
                  >
                    + Agregar Medicamento
                  </button>
                </div>
              </div>

              <div className="inventory-grid">
                {filteredInventory.length === 0 ? (
                  <div className="empty-state">
                    {searchQuery ? 'No se encontraron medicamentos' : 'Inventario vacío'}
                  </div>
                ) : (
                  filteredInventory.map(item => {
                    const isLowStock = item.stock <= item.minimo;
                    const stockPercentage = (item.stock / (item.minimo * 3)) * 100;
                    
                    return (
                      <div key={item.id} className={`inventory-item ${isLowStock ? 'low-stock' : ''}`}>
                        <div className="inventory-header">
                          <h4>{item.nombre}</h4>
                          <span className="inventory-category">{item.categoria}</span>
                        </div>
                        
                        <div className="inventory-details">
                          <div className="detail-row">
                            <span>Stock Actual:</span>
                            <strong className={isLowStock ? 'text-danger' : 'text-success'}>
                              {item.stock} unidades
                            </strong>
                          </div>
                          <div className="detail-row">
                            <span>Stock Mínimo:</span>
                            <strong>{item.minimo} unidades</strong>
                          </div>
                          <div className="detail-row">
                            <span>Precio Unitario:</span>
                            <strong>${item.precio.toFixed(2)}</strong>
                          </div>
                        </div>

                        <div className="inventory-stock">
                          <div className="stock-bar">
                            <div 
                              className="stock-fill"
                              style={{
                                width: `${Math.min(stockPercentage, 100)}%`,
                                background: isLowStock ? '#f44336' : '#4caf50'
                              }}
                            />
                          </div>
                        </div>

                        {isLowStock && (
                          <div className="low-stock-alert">
                            ⚠️ Stock bajo - Reabastecer pronto
                          </div>
                        )}

                        <div className="inventory-actions">
                          <button className="btn-icon" title="Ajustar Stock">📝</button>
                          <button className="btn-icon" title="Ver Historial">📊</button>
                          <button className="btn-icon success" title="Reabastecer">➕</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* DISPENSADOS VIEW */}
        {activeSection === 'dispensados' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Historial de Entregas</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Paciente</th>
                      <th>Medicamentos</th>
                      <th>Cantidad</th>
                      <th>Propietario</th>
                      <th>Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>14:30</td>
                      <td>
                        <div className="patient-cell">
                          <span className="patient-icon">🐕</span>
                          <strong>Max</strong>
                        </div>
                      </td>
                      <td>Amoxicilina 500mg, Carprofeno 75mg</td>
                      <td>2 productos</td>
                      <td>Juan Pérez</td>
                      <td>$60.00</td>
                      <td><span className="status-badge success">✓ Entregado</span></td>
                    </tr>
                    <tr>
                      <td>13:15</td>
                      <td>
                        <div className="patient-cell">
                          <span className="patient-icon">🐈</span>
                          <strong>Luna</strong>
                        </div>
                      </td>
                      <td>Vacuna Triple Felina</td>
                      <td>1 producto</td>
                      <td>María Sánchez</td>
                      <td>$45.00</td>
                      <td><span className="status-badge success">✓ Entregado</span></td>
                    </tr>
                    <tr>
                      <td>11:45</td>
                      <td>
                        <div className="patient-cell">
                          <span className="patient-icon">🐕</span>
                          <strong>Bobby</strong>
                        </div>
                      </td>
                      <td>Metronidazol 250mg, Omeprazol 20mg</td>
                      <td>2 productos</td>
                      <td>Carlos Ruiz</td>
                      <td>$38.00</td>
                      <td><span className="status-badge success">✓ Entregado</span></td>
                    </tr>
                    <tr>
                      <td>10:20</td>
                      <td>
                        <div className="patient-cell">
                          <span className="patient-icon">🐈</span>
                          <strong>Michi</strong>
                        </div>
                      </td>
                      <td>Enrofloxacina 150mg</td>
                      <td>1 producto</td>
                      <td>Laura Gómez</td>
                      <td>$30.00</td>
                      <td><span className="status-badge success">✓ Entregado</span></td>
                    </tr>
                    <tr>
                      <td>09:00</td>
                      <td>
                        <div className="patient-cell">
                          <span className="patient-icon">🐕</span>
                          <strong>Rocky</strong>
                        </div>
                      </td>
                      <td>Tramadol 50mg, Meloxicam 15mg</td>
                      <td>2 productos</td>
                      <td>Pedro Martínez</td>
                      <td>$72.00</td>
                      <td><span className="status-badge success">✓ Entregado</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="summary-cards">
                <div className="summary-card">
                  <h3>Total Entregas Hoy</h3>
                  <p className="summary-number">{completedToday}</p>
                </div>
                <div className="summary-card">
                  <h3>Ingresos del Día</h3>
                  <p className="summary-number">$1,245.00</p>
                </div>
                <div className="summary-card">
                  <h3>Productos Dispensados</h3>
                  <p className="summary-number">42</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORTES VIEW */}
        {activeSection === 'reportes' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Reportes y Estadísticas</h2>
              
              <div className="reports-grid">
                <div className="report-card">
                  <h3>📊 Medicamentos Más Dispensados</h3>
                  <div className="report-list">
                    <div className="report-item">
                      <span>1. Amoxicilina 500mg</span>
                      <strong>45 unidades</strong>
                    </div>
                    <div className="report-item">
                      <span>2. Carprofeno 75mg</span>
                      <strong>32 unidades</strong>
                    </div>
                    <div className="report-item">
                      <span>3. Vacuna Séxtuple</span>
                      <strong>28 unidades</strong>
                    </div>
                    <div className="report-item">
                      <span>4. Prednisona 5mg</span>
                      <strong>25 unidades</strong>
                    </div>
                    <div className="report-item">
                      <span>5. Metronidazol 250mg</span>
                      <strong>22 unidades</strong>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <h3>💰 Ingresos por Categoría</h3>
                  <div className="report-list">
                    <div className="report-item">
                      <span>Antibióticos</span>
                      <strong>$1,250.00</strong>
                    </div>
                    <div className="report-item">
                      <span>Antiinflamatorios</span>
                      <strong>$890.00</strong>
                    </div>
                    <div className="report-item">
                      <span>Vacunas</span>
                      <strong>$780.00</strong>
                    </div>
                    <div className="report-item">
                      <span>Analgésicos</span>
                      <strong>$640.00</strong>
                    </div>
                    <div className="report-item">
                      <span>Otros</span>
                      <strong>$420.00</strong>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <h3>📅 Resumen Mensual</h3>
                  <div className="report-stats">
                    <div className="stat-item">
                      <span>Total Entregas</span>
                      <strong>385</strong>
                    </div>
                    <div className="stat-item">
                      <span>Ingresos Totales</span>
                      <strong>$24,680.00</strong>
                    </div>
                    <div className="stat-item">
                      <span>Promedio Diario</span>
                      <strong>$822.67</strong>
                    </div>
                    <div className="stat-item">
                      <span>Reabastecimientos</span>
                      <strong>12</strong>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <h3>⚠️ Alertas y Notificaciones</h3>
                  <div className="notifications-list">
                    <div className="notification-item warning">
                      <span className="notification-icon">⚠️</span>
                      <div>
                        <strong>Stock Bajo</strong>
                        <p>{getLowStockCount()} productos requieren reabastecimiento</p>
                      </div>
                    </div>
                    <div className="notification-item info">
                      <span className="notification-icon">ℹ️</span>
                      <div>
                        <strong>Pedidos Pendientes</strong>
                        <p>{myTasks.length} órdenes esperan ser despachadas</p>
                      </div>
                    </div>
                    <div className="notification-item success">
                      <span className="notification-icon">✅</span>
                      <div>
                        <strong>Meta Alcanzada</strong>
                        <p>Se superó el objetivo de entregas del día</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE DETALLES DE ORDEN */}
        {showOrderDetailsModal && selectedOrder && (
          <div className="modal-overlay" onClick={() => setShowOrderDetailsModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>📝 Detalles de la Orden</h2>
              
              {(() => {
                const patient = systemState.pacientes.find(p => p.id === selectedOrder.pacienteId);
                return patient ? (
                  <>
                    <div className="patient-info-modal">
                      <div className="info-row">
                        <strong>Paciente:</strong> {patient.nombre} ({patient.raza})
                      </div>
                      <div className="info-row">
                        <strong>Propietario:</strong> {patient.propietario}
                      </div>
                      <div className="info-row">
                        <strong>Teléfono:</strong> <a href={`tel:${patient.telefono}`}>{patient.telefono}</a>
                      </div>
                      <div className="info-row">
                        <strong>Ficha:</strong> {patient.numeroFicha}
                      </div>
                    </div>

                    <div className="order-detail-section">
                      <h3>Medicamentos Prescritos</h3>
                      <p>{selectedOrder.descripcion}</p>
                    </div>

                    <div className="order-detail-section">
                      <h3>Información de la Receta</h3>
                      <div className="info-row">
                        <strong>Prioridad:</strong> 
                        <span className={`priority-badge ${selectedOrder.prioridad === 'ALTA' ? 'urgent' : ''}`}>
                          {selectedOrder.prioridad}
                        </span>
                      </div>
                      <div className="info-row">
                        <strong>Fecha:</strong> {new Date(selectedOrder.timestamp).toLocaleDateString()}
                      </div>
                      <div className="info-row">
                        <strong>Hora:</strong> {new Date(selectedOrder.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </>
                ) : null;
              })()}

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowOrderDetailsModal(false)}>
                  Cerrar
                </button>
                <button 
                  className="btn-success"
                  onClick={() => {
                    handlePrepare(selectedOrder.id, selectedOrder.pacienteId);
                    setShowOrderDetailsModal(false);
                  }}
                >
                  Preparar Medicamentos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL AGREGAR MEDICAMENTO */}
        {showNewMedicationModal && (
          <div className="modal-overlay" onClick={() => setShowNewMedicationModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>➕ Agregar Nuevo Medicamento</h2>
              
              <div className="form-group">
                <label>Nombre del Medicamento</label>
                <input type="text" className="form-control" placeholder="Ej: Amoxicilina 500mg" />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select className="form-control">
                  <option value="">Selecciona una categoría</option>
                  <option value="antibioticos">Antibióticos</option>
                  <option value="antiinflamatorios">Antiinflamatorios</option>
                  <option value="analgesicos">Analgésicos</option>
                  <option value="vacunas">Vacunas</option>
                  <option value="corticosteroides">Corticosteroides</option>
                  <option value="protectores">Protectores Gástricos</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Inicial</label>
                  <input type="number" className="form-control" placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Stock Mínimo</label>
                  <input type="number" className="form-control" placeholder="0" />
                </div>
              </div>

              <div className="form-group">
                <label>Precio Unitario</label>
                <input type="number" step="0.01" className="form-control" placeholder="0.00" />
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowNewMedicationModal(false)}>
                  Cancelar
                </button>
                <button 
                  className="btn-success"
                  onClick={() => {
                    alert('Medicamento agregado al inventario');
                    setShowNewMedicationModal(false);
                  }}
                >
                  Agregar al Inventario
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default FarmaciaDashboard;

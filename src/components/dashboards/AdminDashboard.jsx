import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { mockUsers } from '../../data/mockUsers';
import './AdminDashboard.css';

function AdminDashboard() {
  const { currentUser, systemState } = useApp();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Datos de usuarios (usando mockUsers)
  const allUsers = mockUsers;
  
  // Filtros de usuarios
  const usersByRole = {
    RECEPCION: allUsers.filter(u => u.rol === 'RECEPCION'),
    MEDICO: allUsers.filter(u => u.rol === 'MEDICO'),
    FARMACIA: allUsers.filter(u => u.rol === 'FARMACIA'),
    ADMIN: allUsers.filter(u => u.rol === 'ADMIN'),
  };

  // Búsqueda de usuarios
  const filteredUsers = allUsers.filter(user =>
    user.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.rol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Estadísticas del sistema
  const stats = {
    totalUsers: allUsers.length,
    totalPatients: systemState.pacientes.length,
    pendingTasks: Object.values(systemState.tareasPendientes).reduce((acc, arr) => acc + arr.length, 0),
    todayAppointments: systemState.citas.length,
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleDeleteUser = (user) => {
    if (window.confirm(`¿Estás seguro de eliminar al usuario ${user.nombre}?`)) {
      alert('Usuario eliminado (función demo)');
    }
  };

  return (
    <div className="dashboard admin-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>👨‍💼 Admin</h3>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'usuarios' ? 'active' : ''}`}
            onClick={() => setActiveSection('usuarios')}
          >
            <span className="nav-icon">👥</span>
            <span>Usuarios</span>
            <span className="nav-badge">{allUsers.length}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'pacientes' ? 'active' : ''}`}
            onClick={() => setActiveSection('pacientes')}
          >
            <span className="nav-icon">🐾</span>
            <span>Pacientes</span>
            <span className="nav-badge">{systemState.pacientes.length}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'reportes' ? 'active' : ''}`}
            onClick={() => setActiveSection('reportes')}
          >
            <span className="nav-icon">📈</span>
            <span>Reportes</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'auditoria' ? 'active' : ''}`}
            onClick={() => setActiveSection('auditoria')}
          >
            <span className="nav-icon">📋</span>
            <span>Auditoría</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'configuracion' ? 'active' : ''}`}
            onClick={() => setActiveSection('configuracion')}
          >
            <span className="nav-icon">⚙️</span>
            <span>Configuración</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1>
              {activeSection === 'dashboard' && 'Dashboard Administrativo'}
              {activeSection === 'usuarios' && 'Gestión de Usuarios'}
              {activeSection === 'pacientes' && 'Base de Datos de Pacientes'}
              {activeSection === 'reportes' && 'Reportes del Sistema'}
              {activeSection === 'auditoria' && 'Auditoría del Sistema'}
              {activeSection === 'configuracion' && 'Configuración del Sistema'}
            </h1>
            <p>{currentUser.nombre} - Administrador del Sistema</p>
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {activeSection === 'dashboard' && (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#2196f3'}}>👥</div>
                <div className="stat-content">
                  <h3>{stats.totalUsers}</h3>
                  <p>Usuarios del Sistema</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#4caf50'}}>🐾</div>
                <div className="stat-content">
                  <h3>{stats.totalPatients}</h3>
                  <p>Pacientes Registrados</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#ff9800'}}>📋</div>
                <div className="stat-content">
                  <h3>{stats.pendingTasks}</h3>
                  <p>Tareas Pendientes</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#9c27b0'}}>📅</div>
                <div className="stat-content">
                  <h3>{stats.todayAppointments}</h3>
                  <p>Citas del Día</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="content-section">
                <h2>Usuarios por Rol</h2>
                <div className="roles-grid">
                  <div className="role-card recepcion">
                    <div className="role-icon">👩‍💼</div>
                    <h3>Recepción</h3>
                    <p className="role-count">{usersByRole.RECEPCION.length}</p>
                    <div className="role-users">
                      {usersByRole.RECEPCION.map(u => (
                        <div key={u.id} className="user-mini">{u.nombre}</div>
                      ))}
                    </div>
                  </div>

                  <div className="role-card medico">
                    <div className="role-icon">👨‍⚕️</div>
                    <h3>Médicos</h3>
                    <p className="role-count">{usersByRole.MEDICO.length}</p>
                    <div className="role-users">
                      {usersByRole.MEDICO.map(u => (
                        <div key={u.id} className="user-mini">{u.nombre}</div>
                      ))}
                    </div>
                  </div>

                  <div className="role-card farmacia">
                    <div className="role-icon">👩‍🔬</div>
                    <h3>Farmacia</h3>
                    <p className="role-count">{usersByRole.FARMACIA.length}</p>
                    <div className="role-users">
                      {usersByRole.FARMACIA.map(u => (
                        <div key={u.id} className="user-mini">{u.nombre}</div>
                      ))}
                    </div>
                  </div>

                  <div className="role-card admin">
                    <div className="role-icon">👨‍💼</div>
                    <h3>Administradores</h3>
                    <p className="role-count">{usersByRole.ADMIN.length}</p>
                    <div className="role-users">
                      {usersByRole.ADMIN.map(u => (
                        <div key={u.id} className="user-mini">{u.nombre}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="content-section">
                <h2>Actividad del Sistema</h2>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon success">✅</div>
                    <div className="activity-content">
                      <strong>Nueva consulta completada</strong>
                      <p>Dr. Carlos Martínez completó consulta para Max</p>
                      <span className="activity-time">Hace 15 min</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon info">👤</div>
                    <div className="activity-content">
                      <strong>Nuevo paciente registrado</strong>
                      <p>María González registró a Luna (Gato Siamés)</p>
                      <span className="activity-time">Hace 32 min</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon warning">💊</div>
                    <div className="activity-content">
                      <strong>Alerta de stock bajo</strong>
                      <p>Tramadol 50mg requiere reabastecimiento</p>
                      <span className="activity-time">Hace 1 hora</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon success">📦</div>
                    <div className="activity-content">
                      <strong>Medicamentos dispensados</strong>
                      <p>Ana López dispensó medicamentos para Bobby</p>
                      <span className="activity-time">Hace 2 horas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* USUARIOS VIEW */}
        {activeSection === 'usuarios' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <div className="section-header">
                <h2>Gestión de Usuarios</h2>
                <div className="section-actions">
                  <div className="search-bar">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Buscar usuario por nombre, username o rol..."
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
                    onClick={() => setShowNewUserModal(true)}
                  >
                    + Nuevo Usuario
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Usuario</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Especialidad</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-row">
                          {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>
                            <div className="user-cell">
                              <span className="user-avatar">{user.avatar}</span>
                              <strong>{user.username}</strong>
                            </div>
                          </td>
                          <td>{user.nombre}</td>
                          <td>
                            <span className={`role-badge ${user.rol.toLowerCase()}`}>
                              {user.rol}
                            </span>
                          </td>
                          <td>{user.especialidad || '-'}</td>
                          <td>
                            <span className="status-badge success">Activo</span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon"
                                title="Editar"
                                onClick={() => handleEditUser(user)}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-icon danger"
                                title="Eliminar"
                                onClick={() => handleDeleteUser(user)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PACIENTES VIEW */}
        {activeSection === 'pacientes' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Base de Datos de Pacientes</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ficha</th>
                      <th>Paciente</th>
                      <th>Especie/Raza</th>
                      <th>Edad</th>
                      <th>Propietario</th>
                      <th>Teléfono</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemState.pacientes.map(patient => (
                      <tr key={patient.id}>
                        <td><span className="ficha-badge">{patient.numeroFicha}</span></td>
                        <td>
                          <div className="patient-cell">
                            <span className="patient-icon">
                              {patient.especie === 'Perro' ? '🐕' : '🐈'}
                            </span>
                            <strong>{patient.nombre}</strong>
                          </div>
                        </td>
                        <td>{patient.especie} • {patient.raza}</td>
                        <td>{patient.edad}</td>
                        <td>{patient.propietario}</td>
                        <td>
                          <a href={`tel:${patient.telefono}`} className="phone-link">
                            {patient.telefono}
                          </a>
                        </td>
                        <td>
                          <span className={`status-badge ${
                            patient.estado === 'CONSULTA' ? '' :
                            patient.estado === 'ESTUDIOS' ? 'warning' :
                            patient.estado === 'HOSPITALIZADO' ? 'urgent' :
                            'success'
                          }`}>
                            {patient.estado}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn-icon" title="Ver Expediente">📋</button>
                            <button className="btn-icon" title="Editar">✏️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REPORTES VIEW */}
        {activeSection === 'reportes' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Reportes del Sistema</h2>
              
              <div className="reports-grid">
                <div className="report-card">
                  <h3>📊 Consultas por Médico</h3>
                  <div className="report-chart">
                    <div className="chart-bar">
                      <span>Dr. Carlos Martínez</span>
                      <div className="bar-container">
                        <div className="bar-fill" style={{width: '85%', background: '#2196f3'}}></div>
                        <strong>85</strong>
                      </div>
                    </div>
                    <div className="chart-bar">
                      <span>Dr. Ana García</span>
                      <div className="bar-container">
                        <div className="bar-fill" style={{width: '60%', background: '#4caf50'}}></div>
                        <strong>60</strong>
                      </div>
                    </div>
                    <div className="chart-bar">
                      <span>Dr. Luis Pérez</span>
                      <div className="bar-container">
                        <div className="bar-fill" style={{width: '45%', background: '#ff9800'}}></div>
                        <strong>45</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <h3>💰 Ingresos Mensuales</h3>
                  <div className="revenue-stats">
                    <div className="revenue-item">
                      <span className="revenue-month">Diciembre</span>
                      <span className="revenue-amount">$28,450</span>
                    </div>
                    <div className="revenue-item">
                      <span className="revenue-month">Noviembre</span>
                      <span className="revenue-amount">$24,230</span>
                    </div>
                    <div className="revenue-item">
                      <span className="revenue-month">Octubre</span>
                      <span className="revenue-amount">$26,780</span>
                    </div>
                    <div className="revenue-total">
                      <strong>Total Trimestre</strong>
                      <strong className="total-amount">$79,460</strong>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <h3>🐾 Pacientes por Especie</h3>
                  <div className="species-stats">
                    <div className="species-item">
                      <span className="species-icon">🐕</span>
                      <div className="species-info">
                        <strong>Perros</strong>
                        <p>{systemState.pacientes.filter(p => p.especie === 'Perro').length} pacientes</p>
                      </div>
                      <span className="percentage">65%</span>
                    </div>
                    <div className="species-item">
                      <span className="species-icon">🐈</span>
                      <div className="species-info">
                        <strong>Gatos</strong>
                        <p>{systemState.pacientes.filter(p => p.especie === 'Gato').length} pacientes</p>
                      </div>
                      <span className="percentage">35%</span>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <h3>📅 Citas por Estado</h3>
                  <div className="appointments-stats">
                    <div className="stat-row">
                      <span>Completadas</span>
                      <strong className="text-success">145</strong>
                    </div>
                    <div className="stat-row">
                      <span>Programadas</span>
                      <strong className="text-info">23</strong>
                    </div>
                    <div className="stat-row">
                      <span>Canceladas</span>
                      <strong className="text-warning">8</strong>
                    </div>
                    <div className="stat-row">
                      <span>No asistió</span>
                      <strong className="text-danger">5</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUDITORIA VIEW */}
        {activeSection === 'auditoria' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Registro de Auditoría</h2>
              <div className="audit-log">
                <div className="audit-entry">
                  <div className="audit-icon user">👤</div>
                  <div className="audit-details">
                    <strong>Inicio de sesión</strong>
                    <p>María González (Recepción) inició sesión</p>
                    <span className="audit-time">12/12/2025 08:30:15</span>
                  </div>
                </div>
                <div className="audit-entry">
                  <div className="audit-icon create">➕</div>
                  <div className="audit-details">
                    <strong>Nuevo registro</strong>
                    <p>María González registró nuevo paciente: Luna (Ficha #001234)</p>
                    <span className="audit-time">12/12/2025 08:45:22</span>
                  </div>
                </div>
                <div className="audit-entry">
                  <div className="audit-icon update">✏️</div>
                  <div className="audit-details">
                    <strong>Actualización</strong>
                    <p>Dr. Carlos Martínez actualizó expediente de Max</p>
                    <span className="audit-time">12/12/2025 09:15:08</span>
                  </div>
                </div>
                <div className="audit-entry">
                  <div className="audit-icon warning">⚠️</div>
                  <div className="audit-details">
                    <strong>Alerta del sistema</strong>
                    <p>Stock bajo detectado: Tramadol 50mg (25 unidades)</p>
                    <span className="audit-time">12/12/2025 10:00:00</span>
                  </div>
                </div>
                <div className="audit-entry">
                  <div className="audit-icon success">✅</div>
                  <div className="audit-details">
                    <strong>Tarea completada</strong>
                    <p>Ana López dispensó medicamentos para Bobby</p>
                    <span className="audit-time">12/12/2025 10:30:45</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURACION VIEW */}
        {activeSection === 'configuracion' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Configuración del Sistema</h2>
              
              <div className="config-sections">
                <div className="config-card">
                  <h3>⚙️ Configuración General</h3>
                  <div className="config-item">
                    <label>Nombre de la Clínica</label>
                    <input type="text" className="form-control" defaultValue="Clínica Veterinaria San Francisco" />
                  </div>
                  <div className="config-item">
                    <label>Dirección</label>
                    <input type="text" className="form-control" defaultValue="Av. Principal #123" />
                  </div>
                  <div className="config-item">
                    <label>Teléfono</label>
                    <input type="tel" className="form-control" defaultValue="555-1234" />
                  </div>
                  <button className="btn-primary">Guardar Cambios</button>
                </div>

                <div className="config-card">
                  <h3>🔔 Notificaciones</h3>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Alertas de stock bajo</span>
                    </label>
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Recordatorios de citas</span>
                    </label>
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" />
                      <span>Notificaciones por email</span>
                    </label>
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Auditoría automática</span>
                    </label>
                  </div>
                  <button className="btn-primary">Guardar Configuración</button>
                </div>

                <div className="config-card">
                  <h3>🔒 Seguridad</h3>
                  <div className="config-item">
                    <label>Tiempo de sesión (minutos)</label>
                    <input type="number" className="form-control" defaultValue="60" />
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Requerir contraseñas seguras</span>
                    </label>
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" />
                      <span>Autenticación de dos factores</span>
                    </label>
                  </div>
                  <button className="btn-primary">Actualizar Seguridad</button>
                </div>

                <div className="config-card">
                  <h3>💾 Respaldo de Datos</h3>
                  <p className="config-description">
                    Último respaldo: 11/12/2025 23:00
                  </p>
                  <button className="btn-secondary" style={{marginRight: '0.5rem'}}>
                    Crear Respaldo Ahora
                  </button>
                  <button className="btn-info">
                    Restaurar desde Respaldo
                  </button>
                  <div className="config-toggle" style={{marginTop: '1rem'}}>
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Respaldo automático diario</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL NUEVO USUARIO */}
        {showNewUserModal && (
          <div className="modal-overlay" onClick={() => setShowNewUserModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>➕ Agregar Nuevo Usuario</h2>
              
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" className="form-control" placeholder="Ej: Juan Pérez" />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input type="text" className="form-control" placeholder="Ej: jperez" />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" className="form-control" placeholder="••••••••" />
              </div>

              <div className="form-group">
                <label>Rol</label>
                <select className="form-control">
                  <option value="">Selecciona un rol</option>
                  <option value="RECEPCION">Recepción</option>
                  <option value="MEDICO">Médico</option>
                  <option value="FARMACIA">Farmacia</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className="form-group">
                <label>Especialidad (opcional)</label>
                <input type="text" className="form-control" placeholder="Solo para médicos" />
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowNewUserModal(false)}>
                  Cancelar
                </button>
                <button 
                  className="btn-success"
                  onClick={() => {
                    alert('Usuario creado (función demo)');
                    setShowNewUserModal(false);
                  }}
                >
                  Crear Usuario
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDITAR USUARIO */}
        {showEditUserModal && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowEditUserModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>✏️ Editar Usuario</h2>
              
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" className="form-control" defaultValue={selectedUser.nombre} />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input type="text" className="form-control" defaultValue={selectedUser.username} />
              </div>

              <div className="form-group">
                <label>Rol</label>
                <select className="form-control" defaultValue={selectedUser.rol}>
                  <option value="RECEPCION">Recepción</option>
                  <option value="MEDICO">Médico</option>
                  <option value="FARMACIA">Farmacia</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className="form-group">
                <label>Especialidad (opcional)</label>
                <input type="text" className="form-control" defaultValue={selectedUser.especialidad || ''} />
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowEditUserModal(false)}>
                  Cancelar
                </button>
                <button 
                  className="btn-success"
                  onClick={() => {
                    alert('Usuario actualizado (función demo)');
                    setShowEditUserModal(false);
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { mockUsers } from '../../data/mockUsers';
import './AdminDashboard.css';

function AdminDashboard() {
  const { t } = useTranslation();
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
    if (window.confirm(`Are you sure you want to delete user ${user.nombre}?`)) {
      alert('User deleted (demo function)');
    }
  };

  return (
    <div className="dashboard admin-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>👨‍💼 {t('roles.ADMIN')}</h3>
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
            className={`nav-item ${activeSection === 'usuarios' ? 'active' : ''}`}
            onClick={() => setActiveSection('usuarios')}
          >
            <span className="nav-icon">👥</span>
            <span>{t('admin.users')}</span>
            <span className="nav-badge">{allUsers.length}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'pacientes' ? 'active' : ''}`}
            onClick={() => setActiveSection('pacientes')}
          >
            <span className="nav-icon">🐾</span>
            <span>{t('recepcion.patients')}</span>
            <span className="nav-badge">{systemState.pacientes.length}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'reportes' ? 'active' : ''}`}
            onClick={() => setActiveSection('reportes')}
          >
            <span className="nav-icon">📈</span>
            <span>{t('admin.reports')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'auditoria' ? 'active' : ''}`}
            onClick={() => setActiveSection('auditoria')}
          >
            <span className="nav-icon">📋</span>
            <span>{t('admin.audit')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'configuracion' ? 'active' : ''}`}
            onClick={() => setActiveSection('configuracion')}
          >
            <span className="nav-icon">⚙️</span>
            <span>{t('admin.settings')}</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1>
              {activeSection === 'dashboard' && t('admin.title')}
              {activeSection === 'usuarios' && t('admin.userManagement')}
              {activeSection === 'pacientes' && t('admin.patientDatabase')}
              {activeSection === 'reportes' && 'System Reports'}
              {activeSection === 'auditoria' && 'System Audit'}
              {activeSection === 'configuracion' && 'System Configuration'}
            </h1>
            <p>{currentUser.nombre} - System Administrator</p>
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
                  <p>System Users</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#4caf50'}}>🐾</div>
                <div className="stat-content">
                  <h3>{stats.totalPatients}</h3>
                  <p>Registered Patients</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#ff9800'}}>📋</div>
                <div className="stat-content">
                  <h3>{stats.pendingTasks}</h3>
                  <p>Pending Tasks</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#9c27b0'}}>📅</div>
                <div className="stat-content">
                  <h3>{stats.todayAppointments}</h3>
                  <p>Today's Appointments</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="content-section">
                <h2>Users by Role</h2>
                <div className="roles-grid">
                  <div className="role-card recepcion">
                    <div className="role-icon">👩‍💼</div>
                    <h3>Reception</h3>
                    <p className="role-count">{usersByRole.RECEPCION.length}</p>
                    <div className="role-users">
                      {usersByRole.RECEPCION.map(u => (
                        <div key={u.id} className="user-mini">{u.nombre}</div>
                      ))}
                    </div>
                  </div>

                  <div className="role-card medico">
                    <div className="role-icon">👨‍⚕️</div>
                    <h3>Doctors</h3>
                    <p className="role-count">{usersByRole.MEDICO.length}</p>
                    <div className="role-users">
                      {usersByRole.MEDICO.map(u => (
                        <div key={u.id} className="user-mini">{u.nombre}</div>
                      ))}
                    </div>
                  </div>

                  <div className="role-card farmacia">
                    <div className="role-icon">👩‍🔬</div>
                    <h3>Pharmacy</h3>
                    <p className="role-count">{usersByRole.FARMACIA.length}</p>
                    <div className="role-users">
                      {usersByRole.FARMACIA.map(u => (
                        <div key={u.id} className="user-mini">{u.nombre}</div>
                      ))}
                    </div>
                  </div>

                  <div className="role-card admin">
                    <div className="role-icon">👨‍💼</div>
                    <h3>Administrators</h3>
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
                <h2>System Activity</h2>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon success">✅</div>
                    <div className="activity-content">
                      <strong>New consultation completed</strong>
                      <p>Dr. Carlos Martínez completed consultation for Max</p>
                      <span className="activity-time">15 min ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon info">👤</div>
                    <div className="activity-content">
                      <strong>New patient registered</strong>
                      <p>María González registered Luna (Siamese Cat)</p>
                      <span className="activity-time">32 min ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon warning">💊</div>
                    <div className="activity-content">
                      <strong>Low stock alert</strong>
                      <p>Tramadol 50mg requires restocking</p>
                      <span className="activity-time">1 hour ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon success">📦</div>
                    <div className="activity-content">
                      <strong>Medications dispensed</strong>
                      <p>Ana López dispensed medications for Bobby</p>
                      <span className="activity-time">2 hours ago</span>
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
                <h2>User Management</h2>
                <div className="section-actions">
                  <div className="search-bar">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search user by name, username or role..."
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
                    + New User
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Specialty</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-row">
                          {searchQuery ? 'No users found' : 'No registered users'}
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
                            <span className="status-badge success">Active</span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon"
                                title="Edit"
                                onClick={() => handleEditUser(user)}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-icon danger"
                                title="Delete"
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
              <h2>Patient Database</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File #</th>
                      <th>Patient</th>
                      <th>Species/Breed</th>
                      <th>Age</th>
                      <th>Owner</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Actions</th>
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
                            <button className="btn-icon" title="View File">📋</button>
                            <button className="btn-icon" title="Edit">✏️</button>
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
              <h2>System Reports</h2>
              
              <div className="reports-grid">
                <div className="report-card">
                  <h3>📊 Consultations by Doctor</h3>
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
                  <h3>💰 Monthly Revenue</h3>
                  <div className="revenue-stats">
                    <div className="revenue-item">
                      <span className="revenue-month">December</span>
                      <span className="revenue-amount">$28,450</span>
                    </div>
                    <div className="revenue-item">
                      <span className="revenue-month">November</span>
                      <span className="revenue-amount">$24,230</span>
                    </div>
                    <div className="revenue-item">
                      <span className="revenue-month">October</span>
                      <span className="revenue-amount">$26,780</span>
                    </div>
                    <div className="revenue-total">
                      <strong>Quarter Total</strong>
                      <strong className="total-amount">$79,460</strong>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <h3>🐾 Patients by Species</h3>
                  <div className="species-stats">
                    <div className="species-item">
                      <span className="species-icon">🐕</span>
                      <div className="species-info">
                        <strong>Dogs</strong>
                        <p>{systemState.pacientes.filter(p => p.especie === 'Perro').length} patients</p>
                      </div>
                      <span className="percentage">65%</span>
                    </div>
                    <div className="species-item">
                      <span className="species-icon">🐈</span>
                      <div className="species-info">
                        <strong>Cats</strong>
                        <p>{systemState.pacientes.filter(p => p.especie === 'Gato').length} patients</p>
                      </div>
                      <span className="percentage">35%</span>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <h3>📅 Appointments by Status</h3>
                  <div className="appointments-stats">
                    <div className="stat-row">
                      <span>Completed</span>
                      <strong className="text-success">145</strong>
                    </div>
                    <div className="stat-row">
                      <span>Scheduled</span>
                      <strong className="text-info">23</strong>
                    </div>
                    <div className="stat-row">
                      <span>Cancelled</span>
                      <strong className="text-warning">8</strong>
                    </div>
                    <div className="stat-row">
                      <span>No Show</span>
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
              <h2>Audit Log</h2>
              <div className="audit-log">
                <div className="audit-entry">
                  <div className="audit-icon user">👤</div>
                  <div className="audit-details">
                    <strong>Login</strong>
                    <p>María González (Reception) logged in</p>
                    <span className="audit-time">12/12/2025 08:30:15</span>
                  </div>
                </div>
                <div className="audit-entry">
                  <div className="audit-icon create">➕</div>
                  <div className="audit-details">
                    <strong>New record</strong>
                    <p>María González registered new patient: Luna (File #001234)</p>
                    <span className="audit-time">12/12/2025 08:45:22</span>
                  </div>
                </div>
                <div className="audit-entry">
                  <div className="audit-icon update">✏️</div>
                  <div className="audit-details">
                    <strong>Update</strong>
                    <p>Dr. Carlos Martínez updated Max's file</p>
                    <span className="audit-time">12/12/2025 09:15:08</span>
                  </div>
                </div>
                <div className="audit-entry">
                  <div className="audit-icon warning">⚠️</div>
                  <div className="audit-details">
                    <strong>System alert</strong>
                    <p>Low stock detected: Tramadol 50mg (25 units)</p>
                    <span className="audit-time">12/12/2025 10:00:00</span>
                  </div>
                </div>
                <div className="audit-entry">
                  <div className="audit-icon success">✅</div>
                  <div className="audit-details">
                    <strong>Task completed</strong>
                    <p>Ana López dispensed medications for Bobby</p>
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
              <h2>System Configuration</h2>
              
              <div className="config-sections">
                <div className="config-card">
                  <h3>⚙️ General Settings</h3>
                  <div className="config-item">
                    <label>Clinic Name</label>
                    <input type="text" className="form-control" defaultValue="Clínica Veterinaria San Francisco" />
                  </div>
                  <div className="config-item">
                    <label>Address</label>
                    <input type="text" className="form-control" defaultValue="Av. Principal #123" />
                  </div>
                  <div className="config-item">
                    <label>Phone</label>
                    <input type="tel" className="form-control" defaultValue="555-1234" />
                  </div>
                  <button className="btn-primary">Save Changes</button>
                </div>

                <div className="config-card">
                  <h3>🔔 Notifications</h3>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Low stock alerts</span>
                    </label>
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Appointment reminders</span>
                    </label>
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" />
                      <span>Email notifications</span>
                    </label>
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Automatic auditing</span>
                    </label>
                  </div>
                  <button className="btn-primary">Save Configuration</button>
                </div>

                <div className="config-card">
                  <h3>🔒 Security</h3>
                  <div className="config-item">
                    <label>Session timeout (minutes)</label>
                    <input type="number" className="form-control" defaultValue="60" />
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Require strong passwords</span>
                    </label>
                  </div>
                  <div className="config-toggle">
                    <label>
                      <input type="checkbox" />
                      <span>Two-factor authentication</span>
                    </label>
                  </div>
                  <button className="btn-primary">Update Security</button>
                </div>

                <div className="config-card">
                  <h3>💾 Data Backup</h3>
                  <p className="config-description">
                    Last backup: 11/12/2025 23:00
                  </p>
                  <button className="btn-secondary" style={{marginRight: '0.5rem'}}>
                    Create Backup Now
                  </button>
                  <button className="btn-info">
                    Restore from Backup
                  </button>
                  <div className="config-toggle" style={{marginTop: '1rem'}}>
                    <label>
                      <input type="checkbox" defaultChecked />
                      <span>Automatic daily backup</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NEW USER MODAL */}
        {showNewUserModal && (
          <div className="modal-overlay" onClick={() => setShowNewUserModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>➕ Add New User</h2>
              
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" className="form-control" placeholder="E.g.: Juan Pérez" />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input type="text" className="form-control" placeholder="E.g.: jperez" />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input type="password" className="form-control" placeholder="••••••••" />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select className="form-control">
                  <option value="">Select a role</option>
                  <option value="RECEPCION">Reception</option>
                  <option value="MEDICO">Doctor</option>
                  <option value="FARMACIA">Pharmacy</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label>Specialty (optional)</label>
                <input type="text" className="form-control" placeholder="For doctors only" />
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowNewUserModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-success"
                  onClick={() => {
                    alert('User created (demo function)');
                    setShowNewUserModal(false);
                  }}
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT USER MODAL */}
        {showEditUserModal && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowEditUserModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>✏️ Edit User</h2>
              
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" className="form-control" defaultValue={selectedUser.nombre} />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input type="text" className="form-control" defaultValue={selectedUser.username} />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select className="form-control" defaultValue={selectedUser.rol}>
                  <option value="RECEPCION">Reception</option>
                  <option value="MEDICO">Doctor</option>
                  <option value="FARMACIA">Pharmacy</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label>Specialty (optional)</label>
                <input type="text" className="form-control" defaultValue={selectedUser.especialidad || ''} />
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowEditUserModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-success"
                  onClick={() => {
                    alert('User updated (demo function)');
                    setShowEditUserModal(false);
                  }}
                >
                  Save Changes
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

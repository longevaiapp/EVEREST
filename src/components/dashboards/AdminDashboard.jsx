import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import adminService from '../../services/admin.service';
import { ALL_DASHBOARDS, DEFAULT_ACCESS } from '../DashboardSelector';
import './AdminDashboard.css';

const ALL_ROLES = [
  'ADMIN', 'RECEPCION', 'MEDICO', 'LABORATORIO', 'FARMACIA',
  'ESTILISTA', 'HOSPITALIZACION', 'QUIROFANO', 'RECOLECTOR',
  'OPERADOR_CREMATORIO', 'ENTREGA', 'BANCO_SANGRE'
];

function AdminDashboard() {
  const { t } = useTranslation();
  const { currentUser, systemState } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Real users from API
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '', password: '', nombre: '', rol: 'RECEPCION', especialidad: '', telefono: '', dashboardAccess: [],
  });
  const [editUserForm, setEditUserForm] = useState({});
  const [permissionsUser, setPermissionsUser] = useState(null); // user being edited for permissions
  
  // Business Info State
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessConfigured, setBusinessConfigured] = useState(false);
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  
  const [businessForm, setBusinessForm] = useState({
    clinicName: '',
    clinicAddress: '',
    clinicCity: '',
    clinicState: '',
    clinicZip: '',
    clinicPhone: '',
    clinicEmail: '',
    clinicWebsite: '',
    clinicLogo: '',
    taxId: '',
    taxName: '',
    vetName: '',
    vetLicense: '',
    vetSpecialty: '',
    vetSignature: '',
    prescriptionHeader: '',
    prescriptionFooter: '',
    prescriptionWarnings: '',
    // Hospitalization rates
    tarifaHospGeneral: '',
    tarifaHospUCI: '',
    tarifaHospNeonatos: '',
    tarifaHospInfecciosos: '',
    tarifaConsultaGeneral: '',
    // Study rates
    tarifaBH: '',
    tarifaQS: '',
    tarifaRX: '',
    tarifaUS: '',
    tarifaEGO: '',
    tarifaECG: '',
    tarifaElectrolitos: '',
    tarifaSNAP: '',
  });

  // Load real users from API
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const result = await adminService.getUsers();
      setUsers(result.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtered users for search
  const filteredUsers = users.filter(u =>
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.rol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats from real data
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.activo).length,
    totalPatients: systemState.pacientes.length,
    pendingTasks: Object.values(systemState.tareasPendientes).reduce((acc, arr) => acc + arr.length, 0),
  };

  // User CRUD handlers
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminService.createUser(newUserForm);
      toast?.success?.('Usuario creado') || alert('Usuario creado');
      setShowNewUserModal(false);
      setNewUserForm({ email: '', password: '', nombre: '', rol: 'RECEPCION', especialidad: '', telefono: '', dashboardAccess: [] });
      loadUsers();
    } catch (err) {
      toast?.error?.(err.response?.data?.message || err.message) || alert(err.message);
    }
  };

  const handleEditUser = (u) => {
    setSelectedUser(u);
    setEditUserForm({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      especialidad: u.especialidad || '',
      telefono: u.telefono || '',
      activo: u.activo,
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateUser(selectedUser.id, editUserForm);
      toast?.success?.('Usuario actualizado') || alert('Usuario actualizado');
      setShowEditUserModal(false);
      loadUsers();
    } catch (err) {
      toast?.error?.(err.response?.data?.message || err.message) || alert(err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`¿Desactivar usuario ${u.nombre}?`)) return;
    try {
      await adminService.deactivateUser(u.id);
      toast?.success?.('Usuario desactivado');
      loadUsers();
    } catch (err) {
      toast?.error?.(err.response?.data?.message || err.message) || alert(err.message);
    }
  };

  const handleOpenPermissions = (u) => {
    setPermissionsUser({
      ...u,
      dashboardAccess: u.dashboardAccess || DEFAULT_ACCESS[u.rol] || [],
    });
  };

  const handleToggleDashboard = (key) => {
    setPermissionsUser(prev => {
      const current = prev.dashboardAccess || [];
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...prev, dashboardAccess: next };
    });
  };

  const handleSavePermissions = async () => {
    try {
      await adminService.updatePermissions(permissionsUser.id, permissionsUser.dashboardAccess);
      toast?.success?.('Permisos actualizados');
      setPermissionsUser(null);
      loadUsers();
    } catch (err) {
      toast?.error?.(err.response?.data?.message || err.message) || alert(err.message);
    }
  };

  // ==================== BUSINESS INFO FUNCTIONS ====================
  
  const loadBusinessInfo = useCallback(async () => {
    setBusinessLoading(true);
    try {
      const result = await adminService.getBusinessInfo();
      if (result.businessInfo) {
        setBusinessForm({
          clinicName: result.businessInfo.clinicName || '',
          clinicAddress: result.businessInfo.clinicAddress || '',
          clinicCity: result.businessInfo.clinicCity || '',
          clinicState: result.businessInfo.clinicState || '',
          clinicZip: result.businessInfo.clinicZip || '',
          clinicPhone: result.businessInfo.clinicPhone || '',
          clinicEmail: result.businessInfo.clinicEmail || '',
          clinicWebsite: result.businessInfo.clinicWebsite || '',
          clinicLogo: result.businessInfo.clinicLogo || '',
          taxId: result.businessInfo.taxId || '',
          taxName: result.businessInfo.taxName || '',
          vetName: result.businessInfo.vetName || '',
          vetLicense: result.businessInfo.vetLicense || '',
          vetSpecialty: result.businessInfo.vetSpecialty || '',
          vetSignature: result.businessInfo.vetSignature || '',
          prescriptionHeader: result.businessInfo.prescriptionHeader || '',
          prescriptionFooter: result.businessInfo.prescriptionFooter || '',
          prescriptionWarnings: result.businessInfo.prescriptionWarnings || '',
          // Hospitalization rates
          tarifaHospGeneral: result.businessInfo.tarifaHospGeneral || '',
          tarifaHospUCI: result.businessInfo.tarifaHospUCI || '',
          tarifaHospNeonatos: result.businessInfo.tarifaHospNeonatos || '',
          tarifaHospInfecciosos: result.businessInfo.tarifaHospInfecciosos || '',
          tarifaConsultaGeneral: result.businessInfo.tarifaConsultaGeneral || '',
          // Study rates
          tarifaBH: result.businessInfo.tarifaBH || '',
          tarifaQS: result.businessInfo.tarifaQS || '',
          tarifaRX: result.businessInfo.tarifaRX || '',
          tarifaUS: result.businessInfo.tarifaUS || '',
          tarifaEGO: result.businessInfo.tarifaEGO || '',
          tarifaECG: result.businessInfo.tarifaECG || '',
          tarifaElectrolitos: result.businessInfo.tarifaElectrolitos || '',
          tarifaSNAP: result.businessInfo.tarifaSNAP || '',
        });
        setBusinessConfigured(true);
      }
    } catch (err) {
      console.error('[AdminDashboard] Error loading business info:', err);
    } finally {
      setBusinessLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (activeSection === 'negocio') {
      loadBusinessInfo();
    }
  }, [activeSection, loadBusinessInfo]);
  
  const handleBusinessFormChange = (field, value) => {
    setBusinessForm(prev => ({ ...prev, [field]: value }));
  };
  
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast?.error?.('Please select an image file') || alert('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast?.error?.('Image must be less than 2MB') || alert('Image must be less than 2MB');
      return;
    }
    try {
      const base64 = await adminService.fileToBase64(file);
      setBusinessForm(prev => ({ ...prev, clinicLogo: base64 }));
    } catch (err) {
      console.error('Error loading logo:', err);
    }
  };
  
  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast?.error?.('Please select an image file') || alert('Please select an image file');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast?.error?.('Signature must be less than 1MB') || alert('Signature must be less than 1MB');
      return;
    }
    try {
      const base64 = await adminService.fileToBase64(file);
      setBusinessForm(prev => ({ ...prev, vetSignature: base64 }));
    } catch (err) {
      console.error('Error loading signature:', err);
    }
  };
  
  const handleSaveBusinessInfo = async (e) => {
    e.preventDefault();
    if (!businessForm.clinicName || !businessForm.clinicAddress || 
        !businessForm.clinicPhone || !businessForm.vetName || !businessForm.vetLicense) {
      toast?.error?.('Please fill in all required fields') || alert('Please fill in all required fields');
      return;
    }
    setBusinessSaving(true);
    try {
      await adminService.saveBusinessInfo(businessForm);
      setBusinessConfigured(true);
      toast?.success?.('Clinic configuration saved!') || alert('Clinic configuration saved!');
    } catch (err) {
      console.error('[AdminDashboard] Error saving:', err);
      toast?.error?.('Error saving configuration') || alert('Error saving configuration');
    } finally {
      setBusinessSaving(false);
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
            <span className="nav-badge">{users.length}</span>
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
            className={`nav-item ${activeSection === 'negocio' ? 'active' : ''}`}
            onClick={() => setActiveSection('negocio')}
          >
            <span className="nav-icon">🏥</span>
            <span>{t('admin.business', 'Clinic Info')}</span>
            {businessConfigured && <span className="nav-check">✓</span>}
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
              {activeSection === 'negocio' && t('admin.businessInfo', 'Clinic Configuration')}
              {activeSection === 'configuracion' && 'System Configuration'}
            </h1>
            <p>{currentUser?.nombre || user?.nombre || 'Admin'} - System Administrator</p>
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
                  <p>Usuarios totales</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#4caf50'}}>✅</div>
                <div className="stat-content">
                  <h3>{stats.activeUsers}</h3>
                  <p>Usuarios activos</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#ff9800'}}>🐾</div>
                <div className="stat-content">
                  <h3>{stats.totalPatients}</h3>
                  <p>Pacientes registrados</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#9c27b0'}}>📋</div>
                <div className="stat-content">
                  <h3>{stats.pendingTasks}</h3>
                  <p>Tareas pendientes</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="content-section">
                <h2>Usuarios por Rol</h2>
                <div className="roles-grid">
                  {ALL_ROLES.map(role => {
                    const roleUsers = users.filter(u => u.rol === role);
                    if (roleUsers.length === 0) return null;
                    return (
                      <div key={role} className={`role-card ${role.toLowerCase()}`}>
                        <div className="role-icon">{ALL_DASHBOARDS.find(d => d.key === (DEFAULT_ACCESS[role]?.[0]))?.icon || '👤'}</div>
                        <h3>{t(`roles.${role}`, role)}</h3>
                        <p className="role-count">{roleUsers.length}</p>
                        <div className="role-users">
                          {roleUsers.map(u => (
                            <div key={u.id} className="user-mini">{u.nombre}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
                <h2>👥 Usuarios y Permisos</h2>
                <div className="section-actions">
                  <div className="search-bar">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Buscar por nombre, email o rol..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="btn-clear" onClick={() => setSearchQuery('')}>✕</button>
                    )}
                  </div>
                  <button className="btn-primary" onClick={() => setShowNewUserModal(true)}>
                    + Nuevo Usuario
                  </button>
                </div>
              </div>

              {usersLoading ? (
                <div className="loading-state"><div className="spinner"></div><p>Cargando usuarios...</p></div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Dashboards</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan="6" className="empty-row">No se encontraron usuarios</td></tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className={!u.activo ? 'inactive-row' : ''}>
                            <td>
                              <div className="user-cell">
                                <strong>{u.nombre}</strong>
                                {u.especialidad && <small className="text-muted">{u.especialidad}</small>}
                              </div>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`role-badge ${u.rol.toLowerCase()}`}>
                                {t(`roles.${u.rol}`, u.rol)}
                              </span>
                            </td>
                            <td>
                              <div className="dashboard-pills">
                                {(u.dashboardAccess || DEFAULT_ACCESS[u.rol] || []).map(key => (
                                  <span key={key} className="dash-pill">{ALL_DASHBOARDS.find(d => d.key === key)?.icon} {key}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${u.activo ? 'success' : 'danger'}`}>
                                {u.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button className="btn-icon" title="Permisos" onClick={() => handleOpenPermissions(u)}>🔑</button>
                                <button className="btn-icon" title="Editar" onClick={() => handleEditUser(u)}>✏️</button>
                                {u.activo && (
                                  <button className="btn-icon danger" title="Desactivar" onClick={() => handleDeleteUser(u)}>🗑️</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Permissions Panel */}
            {permissionsUser && (
              <div className="modal-overlay" onClick={() => setPermissionsUser(null)}>
                <div className="modal permissions-modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>🔑 Permisos de Dashboard — {permissionsUser.nombre}</h3>
                    <button className="btn-close" onClick={() => setPermissionsUser(null)}>✕</button>
                  </div>
                  <div className="modal-body">
                    <p className="permissions-hint">Selecciona los módulos a los que este usuario tendrá acceso:</p>
                    <div className="permissions-grid">
                      {ALL_DASHBOARDS.map(dash => {
                        const active = permissionsUser.dashboardAccess?.includes(dash.key);
                        return (
                          <button
                            key={dash.key}
                            className={`permission-card ${active ? 'active' : ''}`}
                            onClick={() => handleToggleDashboard(dash.key)}
                            style={{ '--perm-color': dash.color }}
                          >
                            <span className="perm-icon">{dash.icon}</span>
                            <span className="perm-label">{t(`dashboards.${dash.key === 'banco-sangre' ? 'bancoSangre' : dash.key}`, dash.key)}</span>
                            <span className="perm-check">{active ? '✓' : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setPermissionsUser(null)}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSavePermissions}>Guardar Permisos</button>
                  </div>
                </div>
              </div>
            )}

            {/* New User Modal */}
            {showNewUserModal && (
              <div className="modal-overlay" onClick={() => setShowNewUserModal(false)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Nuevo Usuario</h3>
                    <button className="btn-close" onClick={() => setShowNewUserModal(false)}>✕</button>
                  </div>
                  <form onSubmit={handleCreateUser}>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>Nombre *</label>
                        <input type="text" className="form-control" required value={newUserForm.nombre} onChange={e => setNewUserForm(p => ({...p, nombre: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Email *</label>
                        <input type="email" className="form-control" required value={newUserForm.email} onChange={e => setNewUserForm(p => ({...p, email: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Contraseña *</label>
                        <input type="password" className="form-control" required minLength={6} value={newUserForm.password} onChange={e => setNewUserForm(p => ({...p, password: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Rol *</label>
                        <select className="form-control" value={newUserForm.rol} onChange={e => setNewUserForm(p => ({...p, rol: e.target.value}))}>
                          {ALL_ROLES.map(r => <option key={r} value={r}>{t(`roles.${r}`, r)}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Especialidad</label>
                        <input type="text" className="form-control" value={newUserForm.especialidad} onChange={e => setNewUserForm(p => ({...p, especialidad: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Teléfono</label>
                        <input type="text" className="form-control" value={newUserForm.telefono} onChange={e => setNewUserForm(p => ({...p, telefono: e.target.value}))} />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn-secondary" onClick={() => setShowNewUserModal(false)}>Cancelar</button>
                      <button type="submit" className="btn-primary">Crear Usuario</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit User Modal */}
            {showEditUserModal && selectedUser && (
              <div className="modal-overlay" onClick={() => setShowEditUserModal(false)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Editar Usuario</h3>
                    <button className="btn-close" onClick={() => setShowEditUserModal(false)}>✕</button>
                  </div>
                  <form onSubmit={handleUpdateUser}>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>Nombre *</label>
                        <input type="text" className="form-control" required value={editUserForm.nombre} onChange={e => setEditUserForm(p => ({...p, nombre: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Email *</label>
                        <input type="email" className="form-control" required value={editUserForm.email} onChange={e => setEditUserForm(p => ({...p, email: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Rol *</label>
                        <select className="form-control" value={editUserForm.rol} onChange={e => setEditUserForm(p => ({...p, rol: e.target.value}))}>
                          {ALL_ROLES.map(r => <option key={r} value={r}>{t(`roles.${r}`, r)}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Especialidad</label>
                        <input type="text" className="form-control" value={editUserForm.especialidad} onChange={e => setEditUserForm(p => ({...p, especialidad: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Teléfono</label>
                        <input type="text" className="form-control" value={editUserForm.telefono} onChange={e => setEditUserForm(p => ({...p, telefono: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="checkbox-label">
                          <input type="checkbox" checked={editUserForm.activo} onChange={e => setEditUserForm(p => ({...p, activo: e.target.checked}))} />
                          Usuario activo
                        </label>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn-secondary" onClick={() => setShowEditUserModal(false)}>Cancelar</button>
                      <button type="submit" className="btn-primary">Guardar Cambios</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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

        {/* NEGOCIO / CLINIC INFO VIEW */}
        {activeSection === 'negocio' && (
          <div className="dashboard-content">
            {businessLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading clinic configuration...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveBusinessInfo} className="business-info-form">
                <div className="content-section full-width">
                  <h2>🏢 Clinic Data</h2>
                  <p className="section-description">This information will appear on prescriptions and official documents.</p>
                  
                  <div className="form-grid">
                    <div className="form-group required">
                      <label>Clinic Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessForm.clinicName}
                        onChange={(e) => handleBusinessFormChange('clinicName', e.target.value)}
                        placeholder="Veterinary Clinic Name"
                        required
                      />
                    </div>
                    
                    <div className="form-group required">
                      <label>Phone *</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={businessForm.clinicPhone}
                        onChange={(e) => handleBusinessFormChange('clinicPhone', e.target.value)}
                        placeholder="+52 555 123 4567"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group required">
                    <label>Address *</label>
                    <textarea
                      className="form-control"
                      value={businessForm.clinicAddress}
                      onChange={(e) => handleBusinessFormChange('clinicAddress', e.target.value)}
                      placeholder="Full clinic address"
                      rows={2}
                      required
                    />
                  </div>
                  
                  <div className="form-grid three-cols">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessForm.clinicCity}
                        onChange={(e) => handleBusinessFormChange('clinicCity', e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessForm.clinicState}
                        onChange={(e) => handleBusinessFormChange('clinicState', e.target.value)}
                        placeholder="State/Province"
                      />
                    </div>
                    <div className="form-group">
                      <label>ZIP Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessForm.clinicZip}
                        onChange={(e) => handleBusinessFormChange('clinicZip', e.target.value)}
                        placeholder="12345"
                      />
                    </div>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={businessForm.clinicEmail}
                        onChange={(e) => handleBusinessFormChange('clinicEmail', e.target.value)}
                        placeholder="clinic@email.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Website</label>
                      <input
                        type="url"
                        className="form-control"
                        value={businessForm.clinicWebsite}
                        onChange={(e) => handleBusinessFormChange('clinicWebsite', e.target.value)}
                        placeholder="https://www.clinic.com"
                      />
                    </div>
                  </div>
                  
                  {/* Logo Upload */}
                  <div className="form-group">
                    <label>Clinic Logo</label>
                    <div className="upload-area">
                      {businessForm.clinicLogo ? (
                        <div className="preview-container">
                          <img src={businessForm.clinicLogo} alt="Logo" className="logo-preview" />
                          <button 
                            type="button" 
                            className="btn-remove"
                            onClick={() => handleBusinessFormChange('clinicLogo', '')}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder" onClick={() => logoInputRef.current?.click()}>
                          <span className="upload-icon">📷</span>
                          <span>Click to upload logo (Max 2MB)</span>
                        </div>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        hidden
                      />
                    </div>
                  </div>
                </div>
                
                <div className="content-section full-width">
                  <h2>💼 Tax Information</h2>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Tax ID (RFC/EIN)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessForm.taxId}
                        onChange={(e) => handleBusinessFormChange('taxId', e.target.value)}
                        placeholder="XAXX010101000"
                      />
                    </div>
                    <div className="form-group">
                      <label>Legal/Tax Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessForm.taxName}
                        onChange={(e) => handleBusinessFormChange('taxName', e.target.value)}
                        placeholder="Legal business name"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="content-section full-width">
                  <h2>👨‍⚕️ Responsible Veterinarian</h2>
                  <p className="section-description">This information will appear on prescriptions with signature.</p>
                  
                  <div className="form-grid">
                    <div className="form-group required">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessForm.vetName}
                        onChange={(e) => handleBusinessFormChange('vetName', e.target.value)}
                        placeholder="Dr. Juan Pérez López"
                        required
                      />
                    </div>
                    <div className="form-group required">
                      <label>Professional License *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessForm.vetLicense}
                        onChange={(e) => handleBusinessFormChange('vetLicense', e.target.value)}
                        placeholder="Cédula Profesional: 12345678"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Specialty</label>
                    <input
                      type="text"
                      className="form-control"
                      value={businessForm.vetSpecialty}
                      onChange={(e) => handleBusinessFormChange('vetSpecialty', e.target.value)}
                      placeholder="Small Animal Medicine"
                    />
                  </div>
                  
                  {/* Signature Upload */}
                  <div className="form-group">
                    <label>Digital Signature</label>
                    <div className="upload-area signature">
                      {businessForm.vetSignature ? (
                        <div className="preview-container">
                          <img src={businessForm.vetSignature} alt="Signature" className="signature-preview" />
                          <button 
                            type="button" 
                            className="btn-remove"
                            onClick={() => handleBusinessFormChange('vetSignature', '')}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder" onClick={() => signatureInputRef.current?.click()}>
                          <span className="upload-icon">✍️</span>
                          <span>Click to upload signature (PNG with transparent background)</span>
                        </div>
                      )}
                      <input
                        ref={signatureInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureUpload}
                        hidden
                      />
                    </div>
                  </div>
                </div>
                
                <div className="content-section full-width">
                  <h2>📋 Prescription Settings</h2>
                  
                  <div className="form-group">
                    <label>Header Text</label>
                    <textarea
                      className="form-control"
                      value={businessForm.prescriptionHeader}
                      onChange={(e) => handleBusinessFormChange('prescriptionHeader', e.target.value)}
                      placeholder="Additional text for prescription header..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Footer / General Instructions</label>
                    <textarea
                      className="form-control"
                      value={businessForm.prescriptionFooter}
                      onChange={(e) => handleBusinessFormChange('prescriptionFooter', e.target.value)}
                      placeholder="General instructions for all prescriptions..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Standard Warnings</label>
                    <textarea
                      className="form-control"
                      value={businessForm.prescriptionWarnings}
                      onChange={(e) => handleBusinessFormChange('prescriptionWarnings', e.target.value)}
                      placeholder="Standard warnings (allergies, storage, etc.)..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="content-section full-width">
                  <h2>💰 Hospitalization & Study Fees</h2>
                  <p className="section-description">Configure daily hospitalization rates and study fees. These are used to calculate costs at discharge.</p>
                  
                  <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', color: '#2c5aa0' }}>🏥 Hospitalization (per day)</h3>
                  <div className="form-grid four-cols">
                    <div className="form-group">
                      <label>General Ward</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaHospGeneral}
                          onChange={(e) => handleBusinessFormChange('tarifaHospGeneral', e.target.value)}
                          placeholder="350"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>ICU / Intensive Care</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaHospUCI}
                          onChange={(e) => handleBusinessFormChange('tarifaHospUCI', e.target.value)}
                          placeholder="650"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Neonatal Care</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaHospNeonatos}
                          onChange={(e) => handleBusinessFormChange('tarifaHospNeonatos', e.target.value)}
                          placeholder="550"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Infectious Isolation</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaHospInfecciosos}
                          onChange={(e) => handleBusinessFormChange('tarifaHospInfecciosos', e.target.value)}
                          placeholder="500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ maxWidth: '300px' }}>
                    <label>Consultation Fee</label>
                    <div className="input-with-prefix">
                      <span className="prefix">$</span>
                      <input
                        type="number"
                        className="form-control"
                        value={businessForm.tarifaConsultaGeneral}
                        onChange={(e) => handleBusinessFormChange('tarifaConsultaGeneral', e.target.value)}
                        placeholder="500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#2c5aa0' }}>🔬 Laboratory Studies</h3>
                  <div className="form-grid four-cols">
                    <div className="form-group">
                      <label>CBC (BH)</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaBH}
                          onChange={(e) => handleBusinessFormChange('tarifaBH', e.target.value)}
                          placeholder="350"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Chemistry Panel (QS)</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaQS}
                          onChange={(e) => handleBusinessFormChange('tarifaQS', e.target.value)}
                          placeholder="450"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>X-Ray (RX)</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaRX}
                          onChange={(e) => handleBusinessFormChange('tarifaRX', e.target.value)}
                          placeholder="400"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Ultrasound (US)</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaUS}
                          onChange={(e) => handleBusinessFormChange('tarifaUS', e.target.value)}
                          placeholder="600"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-grid four-cols">
                    <div className="form-group">
                      <label>Urinalysis (EGO)</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaEGO}
                          onChange={(e) => handleBusinessFormChange('tarifaEGO', e.target.value)}
                          placeholder="250"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>ECG</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaECG}
                          onChange={(e) => handleBusinessFormChange('tarifaECG', e.target.value)}
                          placeholder="400"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Electrolytes</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaElectrolitos}
                          onChange={(e) => handleBusinessFormChange('tarifaElectrolitos', e.target.value)}
                          placeholder="300"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>SNAP Test</label>
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={businessForm.tarifaSNAP}
                          onChange={(e) => handleBusinessFormChange('tarifaSNAP', e.target.value)}
                          placeholder="500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="form-actions sticky">
                  <button type="submit" className="btn-primary" disabled={businessSaving}>
                    {businessSaving ? '⏳ Saving...' : '💾 Save Configuration'}
                  </button>
                  {businessConfigured && (
                    <span className="save-status">✓ Configured</span>
                  )}
                </div>
              </form>
            )}
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

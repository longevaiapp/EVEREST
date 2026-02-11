import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import useFarmacia from '../../hooks/useFarmacia';
import './FarmaciaDashboard.css';

// Skeleton Loader Components
const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-title"></div>
    <div className="skeleton skeleton-text"></div>
    <div className="skeleton skeleton-text short"></div>
  </div>
);

const SkeletonStatCard = () => (
  <div className="skeleton-stat-card">
    <div className="skeleton skeleton-icon"></div>
    <div className="skeleton-stat-content">
      <div className="skeleton skeleton-text short"></div>
      <div className="skeleton skeleton-number"></div>
    </div>
  </div>
);

const SkeletonTableRow = () => (
  <tr className="skeleton-row">
    <td><div className="skeleton skeleton-text"></div></td>
    <td><div className="skeleton skeleton-text"></div></td>
    <td><div className="skeleton skeleton-text"></div></td>
    <td><div className="skeleton skeleton-text short"></div></td>
    <td><div className="skeleton skeleton-text short"></div></td>
  </tr>
);

const SkeletonInventoryCard = () => (
  <div className="skeleton-inventory-card">
    <div className="skeleton skeleton-title"></div>
    <div className="skeleton skeleton-text"></div>
    <div className="skeleton skeleton-badge"></div>
    <div className="skeleton-actions">
      <div className="skeleton skeleton-button"></div>
      <div className="skeleton skeleton-button"></div>
    </div>
  </div>
);

// Medication categories for dropdowns
const MEDICATION_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'antibioticos', label: 'Antibiotics' },
  { value: 'antiinflamatorios', label: 'Anti-inflammatories' },
  { value: 'analgesicos', label: 'Analgesics' },
  { value: 'vacunas', label: 'Vaccines' },
  { value: 'corticosteroides', label: 'Corticosteroids' },
  { value: 'protectores', label: 'Gastric Protectors' },
  { value: 'antiparasitarios', label: 'Antiparasitics' },
  { value: 'dermatologicos', label: 'Dermatological' },
  { value: 'vitaminas', label: 'Vitamins & Supplements' },
  { value: 'otros', label: 'Other' }
];

// Initial empty medication form
const EMPTY_MEDICATION_FORM = {
  name: '',
  genericName: '',
  category: '',
  presentation: '',
  concentration: '',
  unit: 'unit',
  currentStock: 0,
  minStock: 10,
  maxStock: 100,
  costPrice: 0,
  salePrice: 0,
  supplier: '',
  location: '',
  expirationDate: '',
  requiresRefrigeration: false,
  isControlled: false,
  status: 'ACTIVO',
  imageUrl: ''
};

function FarmaciaDashboard() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const { systemState, completeTask, deliverMedication, addToHistory } = useApp();
  const currentUser = user; // Use authenticated user
  const {
    medications,
    pendingPrescriptions,
    dispenseHistory,
    stockAlerts,
    loading,
    error,
    lowStockCount,
    urgentPrescriptions,
    todayStats,
    fetchMedications,
    fetchPendingPrescriptions,
    fetchDispenseHistory,
    fetchStockAlerts,
    createMedication,
    updateMedication,
    adjustStock,
    fetchStockMovements,
    stockMovements,
    markAsExpired,
    resolveAlert,
    dispensePrescription,
    rejectPrescription,
    refreshAll,
    fetchPharmacyStats,
    pharmacyStats,
  } = useFarmacia();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [preparingMeds, setPreparingMeds] = useState({});
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNewMedicationModal, setShowNewMedicationModal] = useState(false);
  const [showEditMedicationModal, setShowEditMedicationModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedMedicationForEdit, setSelectedMedicationForEdit] = useState(null);
  
  // Stock operation modals state
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showStockHistoryModal, setShowStockHistoryModal] = useState(false);
  const [showMarkExpiredModal, setShowMarkExpiredModal] = useState(false);
  const [showResolveAlertModal, setShowResolveAlertModal] = useState(false);
  const [showIgnoreConfirm, setShowIgnoreConfirm] = useState(false);
  const [selectedMedicationForStock, setSelectedMedicationForStock] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  // Resolve alert form
  const [resolveAlertForm, setResolveAlertForm] = useState({
    resolution: 'RESUELTA', // 'RESUELTA' or 'IGNORADA'
    notes: ''
  });
  const [resolveAlertErrors, setResolveAlertErrors] = useState({});
  
  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    type: 'confirm', // 'confirm', 'danger', 'warning'
    onConfirm: null
  });
  
  // Adjust stock form
  const [adjustStockForm, setAdjustStockForm] = useState({
    adjustmentType: 'add', // 'add' or 'remove'
    quantity: 0,
    reason: '',
    batchNumber: ''
  });
  const [adjustStockErrors, setAdjustStockErrors] = useState({});
  
  // Restock form
  const [restockForm, setRestockForm] = useState({
    quantity: 0,
    batchNumber: '',
    expirationDate: '',
    costPrice: 0,
    supplier: '',
    invoiceNumber: ''
  });
  const [restockErrors, setRestockErrors] = useState({});
  
  // Mark expired form
  const [markExpiredForm, setMarkExpiredForm] = useState({
    quantity: 0,
    batchNumber: '',
    notes: ''
  });
  const [markExpiredErrors, setMarkExpiredErrors] = useState({});
  
  // Stock history filters
  const [stockHistoryFilters, setStockHistoryFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0],
    type: ''
  });
  
  // Dispense history date picker
  const [dispenseHistoryDate, setDispenseHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDispense, setSelectedDispense] = useState(null);
  const [showDispenseDetailsModal, setShowDispenseDetailsModal] = useState(false);
  
  // Reports state
  const [reportsDateRange, setReportsDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // 1st of month
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportsLoading, setReportsLoading] = useState({
    topMeds: false,
    revenue: false,
    summary: false,
    alerts: false
  });
  
  // Debounce timer ref
  const searchTimeoutRef = useRef(null);
  
  // Medication form state (for create/edit)
  const [medicationForm, setMedicationForm] = useState({ ...EMPTY_MEDICATION_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Dispense form state
  const [dispenseForm, setDispenseForm] = useState({
    items: [],
    deliveredTo: '',
    notes: '',
    partialReason: ''
  });
  
  // Reject form state
  const [rejectForm, setRejectForm] = useState({
    reason: '',
    notes: ''
  });

  // Fetch medications on mount
  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  // Fetch other data on mount
  useEffect(() => {
    fetchPendingPrescriptions();
    // Fetch all dispenses first, then filter by date
    fetchDispenseHistory({});
    fetchStockAlerts();
    fetchPharmacyStats();
  }, [fetchPendingPrescriptions, fetchDispenseHistory, fetchStockAlerts, fetchPharmacyStats]);
  
  // Refetch dispense history when date changes
  useEffect(() => {
    if (activeSection === 'dispensados') {
      fetchDispenseHistory({ date: dispenseHistoryDate });
    }
  }, [dispenseHistoryDate, activeSection, fetchDispenseHistory]);
  
  // Fetch reports data when entering reports section or date range changes
  useEffect(() => {
    if (activeSection === 'reportes') {
      fetchPharmacyStats({ ...reportsDateRange });
    }
  }, [activeSection, reportsDateRange, fetchPharmacyStats]);

  // Debounced search - calls API after 300ms of inactivity
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      fetchMedications({ search: searchQuery, category: categoryFilter });
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, categoryFilter, fetchMedications]);

  // Legacy compatibility - merge API prescriptions with context tasks
  const myTasks = systemState?.tareasPendientes?.FARMACIA || [];
  const allPendingOrders = [...pendingPrescriptions, ...myTasks];
  const pharmacyPatients = systemState?.pacientes?.filter(p => p.estado === 'EN_FARMACIA') || [];
  
  // Filter orders
  const urgentOrders = allPendingOrders.filter(t => 
    t.prioridad === 'ALTA' || t.prioridad === 'URGENTE' || t.priority === 'urgent' || t.priority === 'high'
  );
  const completedToday = todayStats.count || dispenseHistory.filter(d => {
    const today = new Date().toISOString().split('T')[0];
    const dispenseDate = new Date(d.createdAt).toISOString().split('T')[0];
    return dispenseDate === today;
  }).length;

  // Helper to check if medication is expiring within 30 days
  const isExpiringSoon = (med) => {
    if (!med.expirationDate && !med.fechaVencimiento) return false;
    const expirationDate = new Date(med.expirationDate || med.fechaVencimiento);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expirationDate <= thirtyDaysFromNow;
  };

  // Helper to get days until expiration
  const getDaysUntilExpiration = (med) => {
    if (!med.expirationDate && !med.fechaVencimiento) return null;
    const expirationDate = new Date(med.expirationDate || med.fechaVencimiento);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Show confirmation dialog helper
  const showConfirmDialog = (title, message, onConfirm, type = 'confirm') => {
    setConfirmDialog({
      show: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  // Close confirmation dialog
  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, show: false, onConfirm: null }));
  };

  // Handle confirm action
  const handleConfirmAction = async () => {
    if (confirmDialog.onConfirm) {
      await confirmDialog.onConfirm();
    }
    closeConfirmDialog();
  };

  // Transform API medications to display format with memoization
  const inventory = useMemo(() => {
    return medications.map(med => ({
      id: med.id,
      nombre: med.name || med.nombre,
      genericName: med.genericName || med.nombreGenerico || '',
      stock: Number(med.currentStock ?? med.stockActual ?? 0),
      minimo: Number(med.minStock ?? med.stockMinimo ?? 10),
      maximo: Number(med.maxStock ?? med.stockMaximo ?? 100),
      categoria: med.category || med.categoria || 'Other',
      precio: Number(med.salePrice ?? med.precioVenta ?? 0),
      costPrice: Number(med.costPrice ?? med.precioCosto ?? 0),
      presentation: med.presentation || med.presentacion || '',
      concentration: med.concentration || med.concentracion || '',
      unit: med.unit || med.unidad || 'unit',
      location: med.location || med.ubicacion || '',
      supplier: med.supplier || med.proveedor || '',
      expirationDate: med.expirationDate || med.fechaVencimiento || null,
      requiresRefrigeration: med.requiresRefrigeration || med.requiereRefrigeracion || false,
      isControlled: med.isControlled || med.esControlado || false,
      status: med.status || med.estado || 'ACTIVO',
      imageUrl: med.imageUrl || null,
      // Original data for editing
      _original: med
    }));
  }, [medications]);

  // Get low stock count from actual data
  const getLowStockCount = () => {
    return lowStockCount || inventory.filter(item => item.stock <= item.minimo).length;
  };

  // Validate medication form
  const validateMedicationForm = () => {
    const errors = {};
    
    if (!medicationForm.name?.trim()) {
      errors.name = 'Medication name is required';
    }
    if (!medicationForm.category?.trim()) {
      errors.category = 'Category is required';
    }
    if (!medicationForm.presentation?.trim()) {
      errors.presentation = 'Presentation is required';
    }
    if (!medicationForm.unit?.trim()) {
      errors.unit = 'Unit is required';
    }
    if (medicationForm.currentStock < 0) {
      errors.currentStock = 'Stock cannot be negative';
    }
    if (medicationForm.minStock < 0) {
      errors.minStock = 'Minimum stock cannot be negative';
    }
    if (medicationForm.salePrice < 0) {
      errors.salePrice = 'Sale price cannot be negative';
    }
    if (medicationForm.salePrice <= 0) {
      errors.salePrice = 'Sale price is required';
    }
    if (medicationForm.costPrice < 0) {
      errors.costPrice = 'Cost price cannot be negative';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle image upload for medication
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleFormChange('imageUrl', reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Remove medication image
  const handleRemoveImage = () => {
    handleFormChange('imageUrl', '');
  };

  // Handle create medication
  const handleCreateMedication = async () => {
    if (!validateMedicationForm()) return;
    
    setIsSaving(true);
    try {
      await createMedication(medicationForm);
      await fetchMedications();
      setShowNewMedicationModal(false);
      setMedicationForm({ ...EMPTY_MEDICATION_FORM });
      toast.success(t('farmacia.toast.medicationAdded'));
    } catch (err) {
      console.error('[FarmaciaDashboard] Error creating medication:', err);
      toast.error(t('farmacia.toast.errorSaving') + ': ' + (err.message || t('farmacia.errors.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit medication click
  const handleEditClick = (item) => {
    const original = item._original || item;
    setSelectedMedicationForEdit(item);
    setMedicationForm({
      name: original.name || original.nombre || '',
      genericName: original.genericName || original.nombreGenerico || '',
      category: original.category || original.categoria || '',
      presentation: original.presentation || original.presentacion || '',
      concentration: original.concentration || original.concentracion || '',
      unit: original.unit || original.unidad || 'unit',
      currentStock: original.currentStock ?? original.stockActual ?? 0,
      minStock: original.minStock ?? original.stockMinimo ?? 10,
      maxStock: original.maxStock ?? original.stockMaximo ?? 100,
      costPrice: original.costPrice ?? original.precioCosto ?? 0,
      salePrice: original.salePrice ?? original.precioVenta ?? 0,
      supplier: original.supplier || original.proveedor || '',
      location: original.location || original.ubicacion || '',
      expirationDate: original.expirationDate || original.fechaVencimiento || '',
      requiresRefrigeration: original.requiresRefrigeration || original.requiereRefrigeracion || false,
      isControlled: original.isControlled || original.esControlado || false,
      status: original.status || original.estado || 'ACTIVO',
      imageUrl: original.imageUrl || ''
    });
    setFormErrors({});
    setShowEditMedicationModal(true);
  };

  // Handle update medication
  const handleUpdateMedication = async () => {
    if (!validateMedicationForm()) return;
    if (!selectedMedicationForEdit) return;
    
    setIsSaving(true);
    try {
      await updateMedication(selectedMedicationForEdit.id, medicationForm);
      await fetchMedications();
      setShowEditMedicationModal(false);
      setSelectedMedicationForEdit(null);
      setMedicationForm({ ...EMPTY_MEDICATION_FORM });
      toast.success(t('farmacia.toast.medicationUpdated'));
    } catch (err) {
      console.error('[FarmaciaDashboard] Error updating medication:', err);
      toast.error(t('farmacia.toast.errorSaving') + ': ' + (err.message || t('farmacia.errors.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deactivate medication
  const handleDeactivateMedication = async () => {
    if (!selectedMedicationForEdit) return;
    
    setIsSaving(true);
    try {
      await updateMedication(selectedMedicationForEdit.id, { status: 'INACTIVO' });
      await fetchMedications();
      setShowDeactivateConfirm(false);
      setShowEditMedicationModal(false);
      setSelectedMedicationForEdit(null);
      setMedicationForm({ ...EMPTY_MEDICATION_FORM });
      toast.success(t('farmacia.toast.medicationDeactivated'));
    } catch (err) {
      console.error('[FarmaciaDashboard] Error deactivating medication:', err);
      toast.error(t('farmacia.toast.errorSaving') + ': ' + (err.message || t('farmacia.errors.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form input change
  const handleFormChange = (field, value) => {
    setMedicationForm(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // ==================== STOCK OPERATIONS ====================

  // Helper to check if medication is expired
  const isExpired = (med) => {
    if (!med.expirationDate && !med.fechaVencimiento) return false;
    const expirationDate = new Date(med.expirationDate || med.fechaVencimiento);
    return expirationDate < new Date();
  };

  // Open Adjust Stock Modal
  const handleOpenAdjustStock = (item) => {
    setSelectedMedicationForStock(item);
    setAdjustStockForm({
      adjustmentType: 'add',
      quantity: 0,
      reason: '',
      batchNumber: ''
    });
    setAdjustStockErrors({});
    setShowAdjustStockModal(true);
  };

  // Calculate new stock for adjust preview
  const calculateNewStock = () => {
    if (!selectedMedicationForStock) return 0;
    const currentStock = selectedMedicationForStock.stock || 0;
    const qty = parseInt(adjustStockForm.quantity) || 0;
    return adjustStockForm.adjustmentType === 'add' 
      ? currentStock + qty 
      : currentStock - qty;
  };

  // Validate adjust stock form
  const validateAdjustStockForm = () => {
    const errors = {};
    
    if (!adjustStockForm.quantity || adjustStockForm.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    if (!adjustStockForm.reason?.trim()) {
      errors.reason = 'Reason is required for audit';
    }
    if (calculateNewStock() < 0) {
      errors.quantity = 'Cannot reduce stock below 0';
    }
    
    setAdjustStockErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit adjust stock
  const handleSubmitAdjustStock = async () => {
    if (!validateAdjustStockForm()) return;
    
    setIsSaving(true);
    try {
      const qty = adjustStockForm.adjustmentType === 'add' 
        ? adjustStockForm.quantity 
        : -adjustStockForm.quantity;
      
      await adjustStock(
        selectedMedicationForStock.id,
        qty,
        adjustStockForm.reason,
        adjustStockForm.batchNumber || null
      );
      
      await fetchMedications();
      setShowAdjustStockModal(false);
      setSelectedMedicationForStock(null);
      toast.success(t('farmacia.toast.stockAdjusted'));
    } catch (err) {
      console.error('[FarmaciaDashboard] Error adjusting stock:', err);
      toast.error(t('farmacia.errors.adjustFailed') + ': ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Open Restock Modal
  const handleOpenRestock = (item) => {
    setSelectedMedicationForStock(item);
    setRestockForm({
      quantity: 0,
      batchNumber: '',
      expirationDate: '',
      costPrice: item.costPrice || 0,
      supplier: item.supplier || '',
      invoiceNumber: ''
    });
    setRestockErrors({});
    setShowRestockModal(true);
  };

  // Validate restock form
  const validateRestockForm = () => {
    const errors = {};
    
    if (!restockForm.quantity || restockForm.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    if (!restockForm.batchNumber?.trim()) {
      errors.batchNumber = 'Batch number is required';
    }
    if (!restockForm.expirationDate) {
      errors.expirationDate = 'Expiration date is required';
    } else {
      const expDate = new Date(restockForm.expirationDate);
      if (expDate <= new Date()) {
        errors.expirationDate = 'Expiration date must be in the future';
      }
    }
    
    setRestockErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit restock
  const handleSubmitRestock = async () => {
    if (!validateRestockForm()) return;
    
    setIsSaving(true);
    try {
      // Build reason with restock details
      const reason = `RESTOCK: Batch ${restockForm.batchNumber}, Exp: ${restockForm.expirationDate}` +
        (restockForm.supplier ? `, Supplier: ${restockForm.supplier}` : '') +
        (restockForm.invoiceNumber ? `, Invoice: ${restockForm.invoiceNumber}` : '');
      
      await adjustStock(
        selectedMedicationForStock.id,
        restockForm.quantity,
        reason,
        restockForm.batchNumber
      );
      
      // Update medication with new expiration and cost if provided
      const updateData = {};
      if (restockForm.expirationDate) {
        updateData.expirationDate = restockForm.expirationDate;
      }
      if (restockForm.costPrice > 0) {
        updateData.costPrice = restockForm.costPrice;
      }
      if (Object.keys(updateData).length > 0) {
        await updateMedication(selectedMedicationForStock.id, updateData);
      }
      
      // Resolve any STOCK_BAJO or AGOTADO alerts for this medication
      const medicationAlerts = stockAlerts.filter(
        a => a.medicationId === selectedMedicationForStock.id && 
        (a.type === 'STOCK_BAJO' || a.type === 'AGOTADO') &&
        a.status === 'PENDIENTE'
      );
      for (const alert of medicationAlerts) {
        try {
          await resolveAlert(alert.id, 'RESUELTA', `Restocked: +${restockForm.quantity} units`);
        } catch (e) {
          console.warn('Could not resolve alert:', e);
        }
      }
      
      await fetchMedications();
      await fetchStockAlerts();
      setShowRestockModal(false);
      setSelectedMedicationForStock(null);
      
      toast.success(t('farmacia.toast.stockRestocked'));
    } catch (err) {
      console.error('[FarmaciaDashboard] Error restocking:', err);
      toast.error(t('farmacia.errors.adjustFailed') + ': ' + (err.message || ''));
    } finally {
      setIsSaving(true);
    }
  };

  // Open Stock History Modal
  const handleOpenStockHistory = async (item) => {
    setSelectedMedicationForStock(item);
    setStockHistoryFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      type: ''
    });
    setShowStockHistoryModal(true);
    
    // Fetch stock movements for this medication
    await fetchStockMovements(item.id, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
  };

  // Fetch movements when filters change
  const handleStockHistoryFilterChange = async (field, value) => {
    const newFilters = { ...stockHistoryFilters, [field]: value };
    setStockHistoryFilters(newFilters);
    
    if (selectedMedicationForStock) {
      await fetchStockMovements(selectedMedicationForStock.id, newFilters);
    }
  };

  // Open Mark Expired Modal
  const handleOpenMarkExpired = (item) => {
    setSelectedMedicationForStock(item);
    setMarkExpiredForm({
      quantity: 0,
      batchNumber: '',
      notes: ''
    });
    setMarkExpiredErrors({});
    setShowMarkExpiredModal(true);
  };

  // Validate mark expired form
  const validateMarkExpiredForm = () => {
    const errors = {};
    
    if (!markExpiredForm.quantity || markExpiredForm.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    if (markExpiredForm.quantity > (selectedMedicationForStock?.stock || 0)) {
      errors.quantity = 'Cannot mark more than current stock as expired';
    }
    
    setMarkExpiredErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit mark as expired
  const handleSubmitMarkExpired = async () => {
    if (!validateMarkExpiredForm()) return;
    
    setIsSaving(true);
    try {
      // Use markAsExpired from hook if available, otherwise use adjustStock
      if (markAsExpired) {
        await markAsExpired(
          selectedMedicationForStock.id,
          markExpiredForm.quantity,
          markExpiredForm.batchNumber || null,
          markExpiredForm.notes || 'Medication expired'
        );
      } else {
        // Fallback: use adjustStock with negative quantity and EXPIRED reason
        const reason = `EXPIRED: ${markExpiredForm.notes || 'Medication expired'}` +
          (markExpiredForm.batchNumber ? `, Batch: ${markExpiredForm.batchNumber}` : '');
        
        await adjustStock(
          selectedMedicationForStock.id,
          -markExpiredForm.quantity,
          reason,
          markExpiredForm.batchNumber || null
        );
      }
      
      await fetchMedications();
      await fetchStockAlerts();
      setShowMarkExpiredModal(false);
      setSelectedMedicationForStock(null);
      
      toast.warning(t('farmacia.toast.lowStockWarning'));
    } catch (err) {
      console.error('[FarmaciaDashboard] Error marking as expired:', err);
      toast.error(t('farmacia.errors.adjustFailed') + ': ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Get movement type label and color
  const getMovementTypeInfo = (type) => {
    const types = {
      'ENTRADA': { label: 'Entry', color: '#4caf50', icon: '📥' },
      'SALIDA': { label: 'Exit', color: '#f44336', icon: '📤' },
      'AJUSTE': { label: 'Adjustment', color: '#ff9800', icon: '🔄' },
      'VENCIDO': { label: 'Expired', color: '#9c27b0', icon: '⚠️' },
      'DISPENSA': { label: 'Dispensed', color: '#2196f3', icon: '💊' },
      'PERDIDA': { label: 'Loss', color: '#e91e63', icon: '❌' }
    };
    return types[type] || { label: type, color: '#757575', icon: '📋' };
  };

  // ==================== ALERT OPERATIONS ====================

  // Get alert type icon
  const getAlertTypeIcon = (type) => {
    const icons = {
      'STOCK_BAJO': '⚠️',
      'AGOTADO': '🔴',
      'POR_VENCER': '⏰',
      'VENCIDO': '☠️'
    };
    return icons[type] || '⚠️';
  };

  // Get alert type label
  const getAlertTypeLabel = (type) => {
    const labels = {
      'STOCK_BAJO': 'Low Stock',
      'AGOTADO': 'Out of Stock',
      'POR_VENCER': 'Expiring Soon',
      'VENCIDO': 'Expired'
    };
    return labels[type] || type;
  };

  // Get priority badge class
  const getPriorityClass = (priority) => {
    const classes = {
      'ALTA': 'priority-high',
      'MEDIA': 'priority-medium',
      'BAJA': 'priority-low'
    };
    return classes[priority] || 'priority-low';
  };

  // Sort alerts by priority and date
  const sortedAlerts = useMemo(() => {
    const priorityOrder = { 'ALTA': 0, 'MEDIA': 1, 'BAJA': 2 };
    return [...stockAlerts]
      .filter(a => a.status === 'PENDIENTE')
      .sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [stockAlerts]);

  // Open Resolve Alert Modal
  const handleOpenResolveAlert = (alert) => {
    setSelectedAlert(alert);
    setResolveAlertForm({
      resolution: 'RESUELTA',
      notes: ''
    });
    setResolveAlertErrors({});
    setShowResolveAlertModal(true);
  };

  // Validate resolve alert form
  const validateResolveAlertForm = () => {
    const errors = {};
    
    if (resolveAlertForm.resolution === 'IGNORADA' && !resolveAlertForm.notes?.trim()) {
      errors.notes = 'Notes are required when ignoring an alert';
    }
    
    setResolveAlertErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle resolution change
  const handleResolutionChange = (resolution) => {
    setResolveAlertForm({ ...resolveAlertForm, resolution });
    // Show confirmation for ignore
    if (resolution === 'IGNORADA') {
      setShowIgnoreConfirm(true);
    }
  };

  // Submit resolve alert
  const handleSubmitResolveAlert = async () => {
    if (!validateResolveAlertForm()) return;
    
    setIsSaving(true);
    try {
      await resolveAlert(
        selectedAlert.id,
        resolveAlertForm.resolution,
        resolveAlertForm.notes || ''
      );
      
      await fetchStockAlerts();
      setShowResolveAlertModal(false);
      setSelectedAlert(null);
      
      if (resolveAlertForm.resolution === 'RESUELTA') {
        toast.success(t('farmacia.toast.alertResolved'));
      } else {
        toast.warning(t('farmacia.toast.alertIgnored'));
      }
    } catch (err) {
      console.error('[FarmaciaDashboard] Error resolving alert:', err);
      toast.error(t('farmacia.errors.saveFailed') + ': ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Open restock from alert
  const handleRestockFromAlert = (alert) => {
    // Find the medication in inventory
    const medication = inventory.find(m => m.id === alert.medicationId);
    if (medication) {
      handleOpenRestock(medication);
    } else {
      // Create a minimal medication object from alert data
      handleOpenRestock({
        id: alert.medicationId,
        nombre: alert.medication?.name || alert.medicationName || 'Unknown',
        stock: alert.currentStock || 0,
        minimo: alert.minStock || 0,
        supplier: alert.medication?.supplier || ''
      });
    }
  };

  // Open dispense modal
  const handleOpenDispenseModal = (prescription) => {
    setSelectedPrescription(prescription);
    
    // Initialize dispense form with prescription items
    // Try to auto-match prescription items to inventory medications
    const items = (prescription.items || []).map(item => {
      const prescribedName = (item.name || item.nombre || '').toLowerCase().trim();
      
      // Try to find a matching medication in inventory
      let matchedMed = null;
      if (item.medicationId) {
        // If already has medicationId, find it
        matchedMed = inventory.find(m => m.id === item.medicationId);
      }
      
      if (!matchedMed) {
        // Try to auto-match by name (fuzzy match)
        matchedMed = inventory.find(m => {
          const invName = (m.nombre || '').toLowerCase();
          return invName.includes(prescribedName) || prescribedName.includes(invName);
        });
      }
      
      return {
        id: item.id,
        prescribedName: item.name || item.nombre, // Original prescribed name
        medicationId: matchedMed?.id || null,
        selectedMedication: matchedMed || null,
        name: matchedMed?.nombre || item.name || item.nombre,
        requestedQty: item.quantity || item.cantidad || 1,
        dispensedQty: item.quantity || item.cantidad || 1,
        unitPrice: matchedMed?.precio || item.unitPrice || item.precioUnitario || 0,
        available: matchedMed ? matchedMed.stock > 0 : false,
        stock: matchedMed?.stock || 0,
        // Keep prescription item details for display
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions
      };
    });
    
    setDispenseForm({
      items,
      deliveredTo: '',
      notes: '',
      partialReason: ''
    });
    setShowDispenseModal(true);
  };
  
  // Handle medication selection for dispense item
  const handleSelectMedication = (index, medicationId) => {
    const newItems = [...dispenseForm.items];
    const selectedMed = inventory.find(m => m.id === medicationId);
    
    if (selectedMed) {
      newItems[index] = {
        ...newItems[index],
        medicationId: selectedMed.id,
        selectedMedication: selectedMed,
        name: selectedMed.nombre,
        unitPrice: selectedMed.precio,
        available: selectedMed.stock > 0,
        stock: selectedMed.stock
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        medicationId: null,
        selectedMedication: null,
        available: false,
        stock: 0
      };
    }
    
    setDispenseForm({ ...dispenseForm, items: newItems });
  };

  // Handle dispense item quantity change
  const handleDispenseQtyChange = (index, value) => {
    const newItems = [...dispenseForm.items];
    newItems[index].dispensedQty = Math.max(0, parseInt(value) || 0);
    setDispenseForm({ ...dispenseForm, items: newItems });
  };

  // Calculate total for dispense
  const calculateDispenseTotal = () => {
    return dispenseForm.items.reduce((sum, item) => {
      return sum + (item.dispensedQty * item.unitPrice);
    }, 0);
  };

  // Check if partial dispense
  const isPartialDispense = () => {
    return dispenseForm.items.some(item => item.dispensedQty < item.requestedQty);
  };

  // Validate dispense form
  const validateDispenseForm = () => {
    if (!dispenseForm.deliveredTo.trim()) {
      return t('farmacia.errors.deliveredToRequired', 'Please enter the name of the person receiving the medication');
    }
    
    // Check that all items to dispense have a medication selected
    for (const item of dispenseForm.items) {
      if (item.dispensedQty > 0 && !item.medicationId) {
        return t('farmacia.errors.selectMedication', `Please select a medication from inventory for: ${item.prescribedName || item.name}`);
      }
      if (item.dispensedQty > 0 && !item.available) {
        return t('farmacia.errors.outOfStock', `${item.name} is out of stock`);
      }
      if (item.dispensedQty > item.stock) {
        return t('farmacia.errors.insufficientStock', `Insufficient stock for ${item.name}. Available: ${item.stock}`);
      }
    }
    
    if (isPartialDispense() && !dispenseForm.partialReason.trim()) {
      return t('farmacia.errors.partialReasonRequired', 'Please provide a reason for partial dispensing');
    }
    return null;
  };

  // Submit dispense
  const handleSubmitDispense = async () => {
    const validationError = validateDispenseForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setPreparingMeds({ ...preparingMeds, [selectedPrescription.id]: true });
      
      // Format items with all required fields for backend
      const items = dispenseForm.items
        .filter(item => item.dispensedQty > 0)
        .map(item => ({
          medicationId: item.medicationId || item.id,
          medicationName: item.name || item.nombre || 'Unknown',
          requestedQty: item.requestedQty || item.quantity || item.cantidad || 1,
          dispensedQty: item.dispensedQty,
          unitPrice: item.unitPrice || item.precioUnitario || 0,
          reason: item.dispensedQty < item.requestedQty ? dispenseForm.partialReason : undefined
        }));

      const notes = dispenseForm.notes + 
        (isPartialDispense() ? `\n[Partial: ${dispenseForm.partialReason}]` : '');

      // Get petId from prescription
      const petId = selectedPrescription.petId || 
                    selectedPrescription.pet?.id || 
                    selectedPrescription.consultation?.visit?.petId;

      await dispensePrescription(selectedPrescription.id, petId, items, dispenseForm.deliveredTo, notes);
      
      // Refresh data
      await fetchPendingPrescriptions();
      await fetchDispenseHistory();
      
      // Close modal and show success
      setShowDispenseModal(false);
      setSelectedPrescription(null);
      
      if (isPartialDispense()) {
        toast.warning(t('farmacia.toast.partialDispense'));
      } else {
        toast.success(t('farmacia.toast.prescriptionDispensed'));
      }
      
    } catch (err) {
      console.error('[FarmaciaDashboard] Error dispensing prescription:', err);
      if (err.message?.includes('stock') || err.message?.includes('Stock')) {
        toast.error(t('farmacia.toast.insufficientStock'));
      } else {
        toast.error(t('farmacia.toast.errorDispensing') + ': ' + (err.message || ''));
      }
    } finally {
      setPreparingMeds({ ...preparingMeds, [selectedPrescription.id]: false });
    }
  };

  // Open reject modal
  const handleOpenRejectModal = (prescription) => {
    setSelectedPrescription(prescription);
    setRejectForm({ reason: '', notes: '' });
    setShowRejectModal(true);
  };

  // Submit rejection
  const handleSubmitReject = async () => {
    if (!rejectForm.reason) {
      toast.error(t('farmacia.prescriptions.selectReason'));
      return;
    }

    try {
      await rejectPrescription(selectedPrescription.id, rejectForm.reason + (rejectForm.notes ? `: ${rejectForm.notes}` : ''));
      
      // Refresh data
      await fetchPendingPrescriptions();
      
      // Close modal and show success
      setShowRejectModal(false);
      setSelectedPrescription(null);
      
      toast.success(t('farmacia.toast.prescriptionRejected'));
      
    } catch (err) {
      console.error('[FarmaciaDashboard] Error rejecting prescription:', err);
      toast.error(t('farmacia.errors.saveFailed') + ': ' + (err.message || ''));
    }
  };

  // Legacy prepare handler (for context-based tasks)
  const handlePrepare = (taskId, patientId) => {
    setPreparingMeds({ ...preparingMeds, [taskId]: true });
    
    setTimeout(() => {
      completeTask('FARMACIA', taskId);
      deliverMedication(patientId);
      setPreparingMeds({ ...preparingMeds, [taskId]: false });
      toast.success(t('farmacia.toast.prescriptionDispensed'));
    }, 1500);
  };

  const handleViewOrderDetails = (task) => {
    setSelectedOrder(task);
    setShowOrderDetailsModal(true);
  };

  // Get patient info for prescription
  const getPatientForPrescription = (prescription) => {
    // Try to get from prescription data
    if (prescription.consultation?.visit?.pet) {
      const pet = prescription.consultation.visit.pet;
      return {
        nombre: pet.nombre,
        especie: pet.especie,
        propietario: pet.owner?.nombre || 'Unknown',
        telefono: pet.owner?.telefono || '',
        numeroFicha: pet.numeroFicha
      };
    }
    // Fallback to context patients
    if (prescription.pacienteId) {
      return systemState?.pacientes?.find(p => p.id === prescription.pacienteId);
    }
    return null;
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
            {allPendingOrders.length > 0 && (
              <span className="nav-badge">{allPendingOrders.length}</span>
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
              {activeSection === 'dashboard' && t('farmacia.title')}
              {activeSection === 'recetas' && t('farmacia.pendingPrescriptions')}
              {activeSection === 'inventario' && t('farmacia.inventory')}
              {activeSection === 'dispensados' && t('farmacia.dispenseHistory.title')}
              {activeSection === 'reportes' && t('farmacia.reports.title')}
            </h1>
            <p>{currentUser?.nombre || 'Farmacia'}</p>
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {activeSection === 'dashboard' && (
          <>
            {/* Loading indicator */}
            {(loading.prescriptions || loading.medications) && (
              <div className="loading-bar">
                <div className="loading-bar-progress"></div>
              </div>
            )}
            
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#9c27b0'}}>💊</div>
                <div className="stat-content">
                  <h3>{loading.prescriptions ? '...' : allPendingOrders.length}</h3>
                  <p>{t('farmacia.stats.pendingOrders')}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#2196f3'}}>📦</div>
                <div className="stat-content">
                  <h3>{loading.medications ? '...' : inventory.length}</h3>
                  <p>{t('farmacia.inventory')}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#f44336'}}>⚠️</div>
                <div className="stat-content">
                  <h3>{loading.medications ? '...' : getLowStockCount()}</h3>
                  <p>{t('farmacia.lowStock')}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#4caf50'}}>✅</div>
                <div className="stat-content">
                  <h3>{loading.dispenses ? '...' : completedToday}</h3>
                  <p>{t('farmacia.completedToday')}</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="content-section">
                <h2>🚨 {t('farmacia.prescriptions.urgentOrders')} {urgentOrders.length > 0 && <span className="count-badge urgent">{urgentOrders.length}</span>}</h2>
                <div className="orders-list">
                  {loading.prescriptions ? (
                    <div className="loading-state">
                      <span className="spinner">⏳</span>
                      <p>{t('farmacia.loading.urgentOrders')}</p>
                    </div>
                  ) : urgentOrders.length === 0 ? (
                    <div className="empty-state">✅ {t('farmacia.empty.noUrgentOrders')}</div>
                  ) : (
                    urgentOrders.map(task => {
                      const patient = getPatientForPrescription(task) || systemState?.pacientes?.find(p => p.id === task.pacienteId);
                      const isPreparing = preparingMeds[task.id];
                      
                      return (
                        <div key={task.id} className="order-card urgent">
                          <div className="order-header">
                            <div className="order-info">
                              <span className="order-priority urgent">{t('farmacia.prescriptions.urgent')}</span>
                              <span className="order-time">{new Date(task.timestamp || task.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          
                          {patient && (
                            <div className="order-patient">
                              <div className="patient-avatar-small">
                                {patient.especie === 'PERRO' || patient.especie === 'Perro' || patient.especie === 'Dog' ? '🐕' : '🐈'}
                              </div>
                              <div>
                                <h4>{patient.nombre}</h4>
                                <p>{patient.propietario} • {patient.numeroFicha}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="order-medications">
                            <strong>{t('farmacia.prescriptions.medications')}:</strong>
                            {task.items ? (
                              <ul className="medication-list">
                                {task.items.map((item, idx) => (
                                  <li key={idx}>{item.name || item.nombre} - {item.quantity || item.cantidad} {item.dosage || ''}</li>
                                ))}
                              </ul>
                            ) : (
                              <p>{task.descripcion || task.generalInstructions || t('farmacia.empty.noDetails')}</p>
                            )}
                          </div>
                          
                          <div className="order-actions">
                            <button 
                              className="btn-secondary"
                              onClick={() => handleViewOrderDetails(task)}
                            >
                              👁️ {t('farmacia.prescriptions.details')}
                            </button>
                            <button 
                              className="btn-danger-outline"
                              onClick={() => handleOpenRejectModal(task)}
                            >
                              ❌ {t('farmacia.prescriptions.reject')}
                            </button>
                            <button 
                              className={`btn-prepare ${isPreparing ? 'preparing' : ''}`}
                              onClick={() => task.items ? handleOpenDispenseModal(task) : handlePrepare(task.id, task.pacienteId)}
                              disabled={isPreparing}
                            >
                              {isPreparing ? `⏳ ${t('farmacia.prescriptions.preparing')}...` : `📦 ${t('farmacia.prescriptions.prepare')}`}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="content-section">
                <div className="section-header">
                  <h2>⚠️ {t('farmacia.alerts.title')} {sortedAlerts.length > 0 && <span className="count-badge urgent">{sortedAlerts.length}</span>}</h2>
                  <button 
                    className="btn-secondary"
                    onClick={() => fetchStockAlerts()}
                    disabled={loading.alerts}
                  >
                    {loading.alerts ? '⏳' : '🔄'}
                  </button>
                </div>
                <div className="alerts-list">
                  {loading.alerts ? (
                    <div className="loading-state">
                      <span className="spinner">⏳</span>
                      <p>{t('farmacia.loading.alerts')}</p>
                    </div>
                  ) : sortedAlerts.length === 0 ? (
                    <div className="empty-state">✅ {t('farmacia.empty.noAlerts')}</div>
                  ) : (
                    sortedAlerts.slice(0, 5).map(alert => (
                      <div key={alert.id} className={`alert-card ${alert.type?.toLowerCase()}`}>
                        <div className="alert-icon">{getAlertTypeIcon(alert.type)}</div>
                        <div className="alert-content">
                          <div className="alert-header-row">
                            <h4>{alert.medication?.name || alert.medicationName || t('farmacia.alerts.unknownMedication')}</h4>
                            <span className={`priority-badge ${getPriorityClass(alert.priority)}`}>
                              {alert.priority || 'BAJA'}
                            </span>
                          </div>
                          <p className="alert-type-label">{getAlertTypeLabel(alert.type)}</p>
                          
                          {(alert.type === 'STOCK_BAJO' || alert.type === 'AGOTADO') && (
                            <p className="alert-stock-info">
                              Stock: <strong className="text-danger">{alert.currentStock ?? alert.medication?.currentStock ?? 0}</strong>
                              {' / Min: '}<strong>{alert.minStock ?? alert.medication?.minStock ?? 10}</strong>
                            </p>
                          )}
                          
                          {(alert.type === 'POR_VENCER' || alert.type === 'VENCIDO') && alert.expirationDate && (
                            <p className="alert-expiry-info">
                              Expires: <strong className={alert.type === 'VENCIDO' ? 'text-danger' : 'text-warning'}>
                                {new Date(alert.expirationDate).toLocaleDateString()}
                              </strong>
                            </p>
                          )}
                          
                          <p className="alert-date">
                            {new Date(alert.createdAt).toLocaleDateString()} {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="alert-actions">
                          {(alert.type === 'STOCK_BAJO' || alert.type === 'AGOTADO') && (
                            <button 
                              className="btn-small success"
                              onClick={() => handleRestockFromAlert(alert)}
                            >
                              ➕ {t('farmacia.stock.restock')}
                            </button>
                          )}
                          <button 
                            className="btn-small"
                            onClick={() => handleOpenResolveAlert(alert)}
                          >
                            ✓ {t('farmacia.alerts.resolve')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {sortedAlerts.length > 5 && (
                    <div className="view-more-link">
                      <button 
                        className="btn-link"
                        onClick={() => setActiveSection('alertas')}
                      >
                        {t('farmacia.alerts.viewAll', { count: sortedAlerts.length })} →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* RECETAS PENDIENTES VIEW */}
        {activeSection === 'recetas' && (
          <div className="dashboard-content">
            <div className="content-section full-width" style={{background: 'linear-gradient(135deg, rgba(30, 60, 114, 0.95) 0%, rgba(42, 82, 152, 0.9) 100%)', borderRadius: '20px', border: '1px solid rgba(100, 150, 255, 0.3)'}}>
              <div className="section-header">
                <h2>📝 {t('farmacia.prescriptions.allPendingOrders')}</h2>
                <button 
                  className="btn-secondary"
                  onClick={() => fetchPendingPrescriptions()}
                  disabled={loading.prescriptions}
                >
                  {loading.prescriptions ? `⏳ ${t('farmacia.loading.generic')}...` : `🔄 ${t('farmacia.refresh')}`}
                </button>
              </div>
              
              {loading.prescriptions ? (
                <div className="loading-state">
                  <span className="spinner">⏳</span>
                  <p>{t('farmacia.loading.prescriptions')}</p>
                </div>
              ) : (
                <div className="orders-list">
                  {allPendingOrders.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">✅</span>
                      <p>{t('farmacia.empty.noPendingOrders')}</p>
                      <p className="text-small">{t('farmacia.empty.allDispensed')}</p>
                    </div>
                  ) : (
                    allPendingOrders.map(task => {
                      const patient = getPatientForPrescription(task) || systemState?.pacientes?.find(p => p.id === task.pacienteId);
                      const isPreparing = preparingMeds[task.id];
                      const isUrgent = task.prioridad === 'ALTA' || task.prioridad === 'URGENTE' || task.priority === 'urgent';
                      
                      return (
                        <div key={task.id} className={`order-card ${isUrgent ? 'urgent' : ''}`}>
                          <div className="order-header">
                            <div className="order-info">
                              <span className={`order-priority ${isUrgent ? 'urgent' : ''}`}>
                                {task.prioridad || task.priority || 'NORMAL'}
                              </span>
                              <span className="order-time">{new Date(task.timestamp || task.createdAt).toLocaleTimeString()}</span>
                              {task.status === 'PARCIAL' && (
                                <span className="order-status partial">PARTIAL</span>
                              )}
                            </div>
                          </div>
                          
                          {patient && (
                            <div className="order-patient">
                              <div className="patient-avatar-small">
                                {patient.especie === 'PERRO' || patient.especie === 'Perro' || patient.especie === 'Dog' ? '🐕' : '🐈'}
                              </div>
                              <div>
                                <h4>{patient.nombre}</h4>
                                <p>{patient.propietario} • {patient.numeroFicha}</p>
                                {patient.telefono && (
                                  <p className="patient-detail">Tel: <a href={`tel:${patient.telefono}`}>{patient.telefono}</a></p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="order-medications">
                            <strong>Prescribed Medications:</strong>
                            {task.items && task.items.length > 0 ? (
                              <ul className="medication-list">
                                {task.items.map((item, idx) => (
                                  <li key={idx}>
                                    <span className="med-name">{item.name || item.nombre}</span>
                                    <span className="med-qty">x{item.quantity || item.cantidad}</span>
                                    {item.dosage && <span className="med-dosage">{item.dosage}</span>}
                                    {item.frequency && <span className="med-freq">{item.frequency}</span>}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>{task.descripcion || task.generalInstructions || 'No details available'}</p>
                            )}
                          </div>
                          
                          {task.generalInstructions && (
                            <div className="order-instructions">
                              <strong>Instructions:</strong>
                              <p>{task.generalInstructions}</p>
                            </div>
                          )}
                          
                          <div className="order-actions">
                            <button 
                              className="btn-secondary"
                              onClick={() => handleViewOrderDetails(task)}
                            >
                              👁️ View Details
                            </button>
                            <button 
                              className="btn-danger-outline"
                              onClick={() => handleOpenRejectModal(task)}
                            >
                              ❌ Reject
                            </button>
                            <button 
                              className={`btn-prepare ${isPreparing ? 'preparing' : ''}`}
                              onClick={() => task.items ? handleOpenDispenseModal(task) : handlePrepare(task.id, task.pacienteId)}
                              disabled={isPreparing}
                            >
                              {isPreparing ? '⏳ Preparing...' : '📦 Prepare & Deliver'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INVENTARIO VIEW */}
        {activeSection === 'inventario' && (
          <div className="dashboard-content">
            <div className="content-section full-width" style={{background: 'linear-gradient(135deg, rgba(30, 60, 114, 0.95) 0%, rgba(42, 82, 152, 0.9) 100%)', borderRadius: '20px', border: '1px solid rgba(100, 150, 255, 0.3)'}}>
              <div className="section-header">
                <h2>Inventory Control</h2>
                <div className="section-actions">
                  <div className="search-bar">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search medication..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="btn-clear" onClick={() => setSearchQuery('')}>
                        ✕
                      </button>
                    )}
                  </div>
                  <select 
                    className="form-control category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    {MEDICATION_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <button 
                    className="btn-secondary"
                    onClick={() => fetchMedications()}
                    disabled={loading.medications}
                  >
                    {loading.medications ? '⏳' : '🔄'}
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setMedicationForm({ ...EMPTY_MEDICATION_FORM });
                      setFormErrors({});
                      setShowNewMedicationModal(true);
                    }}
                  >
                    + {t('farmacia.medications.addNew')}
                  </button>
                </div>
              </div>

              {loading.medications ? (
                <div className="loading-state">
                  <span className="spinner">⏳</span>
                  <p>{t('farmacia.loading.medications')}</p>
                </div>
              ) : (
                <div className="inventory-grid">
                  {inventory.length === 0 ? (
                    <div className="empty-state">
                      {searchQuery || categoryFilter ? t('farmacia.empty.noSearchResults') : t('farmacia.empty.emptyInventory')}
                    </div>
                  ) : (
                    inventory.map(item => {
                      const isLowStock = item.stock <= item.minimo;
                      const expiringSoon = isExpiringSoon(item);
                      const daysUntilExp = getDaysUntilExpiration(item);
                      const stockPercentage = item.maximo > 0 ? (item.stock / item.maximo) * 100 : (item.stock / (item.minimo * 3)) * 100;
                      
                      return (
                        <div key={item.id} className={`inventory-item ${isLowStock ? 'low-stock' : ''} ${expiringSoon ? 'expiring-soon' : ''}`}>
                          {/* Product Image */}
                          <div className="inventory-image">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.nombre} />
                            ) : (
                              <div className="image-placeholder">
                                <span>💊</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="inventory-header">
                            <div className="inventory-title-row">
                              <h4>{item.nombre}</h4>
                              <button 
                                className="btn-edit-small"
                                onClick={() => handleEditClick(item)}
                                title="Edit medication"
                              >
                                ✏️
                              </button>
                            </div>
                            <div className="inventory-badges">
                              <span className="inventory-category">{item.categoria}</span>
                              {item.isControlled && <span className="badge-controlled">⚠️ {t('farmacia.medications.controlled')}</span>}
                              {item.requiresRefrigeration && <span className="badge-refrigeration">❄️</span>}
                            </div>
                          </div>
                          
                          {expiringSoon && (
                            <div className="expiration-warning">
                              ⚠️ {t('farmacia.medications.expiresInDays', { days: daysUntilExp })}
                            </div>
                          )}
                          
                          <div className="inventory-details">
                            <div className="detail-row">
                              <span>{t('farmacia.medications.stock')}:</span>
                              <strong className={isLowStock ? 'text-danger' : 'text-success'}>
                                {item.stock} / {item.minimo}
                              </strong>
                            </div>
                            <div className="detail-row">
                              <span>{t('farmacia.medications.price')}:</span>
                              <strong>${(Number(item.precio) || 0).toFixed(2)}</strong>
                            </div>
                            {item.location && (
                              <div className="detail-row">
                                <span>{t('farmacia.medications.location')}:</span>
                                <strong>{item.location}</strong>
                              </div>
                            )}
                          </div>

                          <div className="inventory-stock">
                            <div className="stock-bar">
                              <div 
                                className="stock-fill"
                                style={{
                                  width: `${Math.min(stockPercentage, 100)}%`,
                                  background: isLowStock ? '#f44336' : stockPercentage > 70 ? '#4caf50' : '#ff9800'
                                }}
                              />
                            </div>
                          </div>

                          {isLowStock && (
                            <div className="low-stock-alert">
                              🔴 {t('farmacia.medications.lowStockAlert')}
                            </div>
                          )}

                          {/* Show mark as expired option for expired medications */}
                          {isExpired(item) && (
                            <div className="expired-warning">
                              ☠️ {t('farmacia.medications.expired')} - 
                              <button 
                                className="btn-link"
                                onClick={() => handleOpenMarkExpired(item)}
                              >
                                {t('farmacia.stock.markExpired')}
                              </button>
                            </div>
                          )}

                          <div className="inventory-actions">
                            <button 
                              className="btn-icon" 
                              title="Adjust Stock"
                              onClick={() => handleOpenAdjustStock(item)}
                            >
                              📝
                            </button>
                            <button 
                              className="btn-icon" 
                              title="View History"
                              onClick={() => handleOpenStockHistory(item)}
                            >
                              📊
                            </button>
                            <button 
                              className="btn-icon success" 
                              title="Restock"
                              onClick={() => handleOpenRestock(item)}
                            >
                              ➕
                            </button>
                            <button 
                              className="btn-icon" 
                              title="Edit"
                              onClick={() => handleEditClick(item)}
                            >
                              ✏️
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISPENSADOS VIEW */}
        {activeSection === 'dispensados' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <div className="section-header-row">
                <h2>📦 {t('farmacia.dispenseHistory.title')}</h2>
                <div className="date-picker-wrapper">
                  <label>{t('farmacia.dispenseHistory.date')}:</label>
                  <input
                    type="date"
                    className="form-control date-picker"
                    value={dispenseHistoryDate}
                    onChange={(e) => setDispenseHistoryDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <button 
                    className="btn-refresh"
                    onClick={() => fetchDispenseHistory({ date: dispenseHistoryDate })}
                    disabled={loading.dispenses}
                  >
                    {loading.dispenses ? '⏳' : '🔄'}
                  </button>
                </div>
              </div>
              
              {loading.dispenses ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>{t('farmacia.loading.dispenseHistory')}</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table dispense-table">
                    <thead>
                      <tr>
                        <th>{t('farmacia.dispenseHistory.time')}</th>
                        <th>{t('farmacia.dispenseHistory.patient')}</th>
                        <th>{t('farmacia.dispenseHistory.medications')}</th>
                        <th>{t('farmacia.dispenseHistory.qty')}</th>
                        <th>{t('farmacia.dispenseHistory.owner')}</th>
                        <th>{t('farmacia.dispenseHistory.total')}</th>
                        <th>{t('farmacia.dispenseHistory.status')}</th>
                        <th>{t('farmacia.dispenseHistory.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispenseHistory.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="empty-row">
                            <div className="empty-state">
                              <span className="empty-icon">📭</span>
                              <p>{t('farmacia.empty.noDispenses')}</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        dispenseHistory.map(dispense => {
                          const dispenseTime = dispense.createdAt 
                            ? new Date(dispense.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : dispense.time || '--:--';
                          const patientName = dispense.patient?.name || dispense.patientName || 'Unknown';
                          const patientSpecies = dispense.patient?.species || dispense.species || 'dog';
                          const ownerName = dispense.patient?.owner?.name || dispense.ownerName || 'Unknown';
                          const medsDisplay = dispense.items?.map(i => i.medication?.name || i.medicationName).join(', ') 
                            || dispense.medications || 'N/A';
                          const itemCount = dispense.items?.length || dispense.itemCount || 1;
                          const total = dispense.total || dispense.valorTotal || 0;
                          const status = dispense.status || 'COMPLETO';
                          
                          return (
                            <tr key={dispense.id}>
                              <td className="time-cell">{dispenseTime}</td>
                              <td>
                                <div className="patient-cell">
                                  <span className="patient-icon">
                                    {patientSpecies.toLowerCase().includes('cat') ? '🐈' : '🐕'}
                                  </span>
                                  <strong>{patientName}</strong>
                                </div>
                              </td>
                              <td className="meds-cell" title={medsDisplay}>
                                {medsDisplay.length > 40 ? medsDisplay.substring(0, 40) + '...' : medsDisplay}
                              </td>
                              <td className="qty-cell">{itemCount} {itemCount === 1 ? t('farmacia.dispenseHistory.item') : t('farmacia.dispenseHistory.items')}</td>
                              <td>{ownerName}</td>
                              <td className="total-cell">${total.toFixed(2)}</td>
                              <td>
                                <span className={`status-badge ${status === 'COMPLETO' ? 'success' : 'warning'}`}>
                                  {status === 'COMPLETO' ? `✓ ${t('farmacia.dispenseHistory.complete')}` : `⚠ ${t('farmacia.dispenseHistory.partial')}`}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn-view-details"
                                  onClick={() => {
                                    setSelectedDispense(dispense);
                                    setShowDispenseDetailsModal(true);
                                  }}
                                >
                                  {t('farmacia.dispenseHistory.viewDetails')}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card blue">
                  <div className="summary-icon">📦</div>
                  <div className="summary-content">
                    <h3>{t('farmacia.dispenseHistory.totalDispensesToday')}</h3>
                    <p className="summary-number">
                      {loading.dispenses ? '...' : (todayStats.count || dispenseHistory.filter(d => {
                        const today = new Date().toISOString().split('T')[0];
                        const dispenseDate = new Date(d.createdAt || d.fecha).toISOString().split('T')[0];
                        return dispenseDate === today;
                      }).length)}
                    </p>
                  </div>
                </div>
                <div className="summary-card green">
                  <div className="summary-icon">💰</div>
                  <div className="summary-content">
                    <h3>{t('farmacia.dispenseHistory.revenueToday')}</h3>
                    <p className="summary-number">
                      {loading.dispenses ? '...' : `$${(todayStats.totalValue || dispenseHistory
                        .filter(d => {
                          const today = new Date().toISOString().split('T')[0];
                          const dispenseDate = new Date(d.createdAt || d.fecha).toISOString().split('T')[0];
                          return dispenseDate === today;
                        })
                        .reduce((sum, d) => sum + (d.total || d.valorTotal || 0), 0)
                      ).toFixed(2)}`}
                    </p>
                  </div>
                </div>
                <div className="summary-card purple">
                  <div className="summary-icon">💊</div>
                  <div className="summary-content">
                    <h3>{t('farmacia.dispenseHistory.productsDispensed')}</h3>
                    <p className="summary-number">
                      {loading.dispenses ? '...' : (todayStats.itemsDispensed || dispenseHistory
                        .filter(d => {
                          const today = new Date().toISOString().split('T')[0];
                          const dispenseDate = new Date(d.createdAt || d.fecha).toISOString().split('T')[0];
                          return dispenseDate === today;
                        })
                        .reduce((sum, d) => sum + (d.items?.length || d.itemCount || 1), 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORTES VIEW */}
        {activeSection === 'reportes' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <div className="section-header-row">
                <h2>📊 {t('farmacia.reports.title')}</h2>
                <div className="reports-controls">
                  <div className="date-range-picker">
                    <label>{t('farmacia.reports.from')}:</label>
                    <input
                      type="date"
                      className="form-control date-picker"
                      value={reportsDateRange.startDate}
                      onChange={(e) => setReportsDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      max={reportsDateRange.endDate}
                    />
                    <label>{t('farmacia.reports.to')}:</label>
                    <input
                      type="date"
                      className="form-control date-picker"
                      value={reportsDateRange.endDate}
                      onChange={(e) => setReportsDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      min={reportsDateRange.startDate}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <button 
                    className="btn-refresh"
                    onClick={() => fetchPharmacyStats({ ...reportsDateRange })}
                    disabled={loading.stats}
                  >
                    {loading.stats ? `⏳ ${t('farmacia.loading.generic')}...` : `🔄 ${t('farmacia.refresh')}`}
                  </button>
                </div>
              </div>
              
              <div className="reports-grid">
                {/* Top 5 Medications */}
                <div className={`report-card ${loading.stats ? 'loading' : ''}`}>
                  <h3>📊 {t('farmacia.reports.mostDispensed')}</h3>
                  {loading.stats ? (
                    <div className="card-loading">
                      <div className="loading-spinner small"></div>
                      <span>{t('farmacia.loading.generic')}...</span>
                    </div>
                  ) : (
                    <div className="report-list">
                      {(pharmacyStats?.topMedications || []).length === 0 ? (
                        <div className="empty-card-state">{t('farmacia.empty.noData')}</div>
                      ) : (
                        (pharmacyStats?.topMedications || []).slice(0, 5).map((med, index) => (
                          <div key={med.id || index} className="report-item">
                            <span>{index + 1}. {med.name || med.medicationName}</span>
                            <strong>{med.totalDispensed || med.quantity || 0} {t('farmacia.reports.units')}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Revenue by Category */}
                <div className={`report-card ${loading.stats ? 'loading' : ''}`}>
                  <h3>💰 {t('farmacia.reports.revenueByCategory')}</h3>
                  {loading.stats ? (
                    <div className="card-loading">
                      <div className="loading-spinner small"></div>
                      <span>{t('farmacia.loading.generic')}...</span>
                    </div>
                  ) : (
                    <div className="report-list">
                      {(pharmacyStats?.revenueByCategory || []).length === 0 ? (
                        <div className="empty-card-state">{t('farmacia.empty.noData')}</div>
                      ) : (
                        (pharmacyStats?.revenueByCategory || []).map((cat, index) => (
                          <div key={cat.category || index} className="report-item">
                            <span>{cat.categoryName || cat.category || t('farmacia.unknown')}</span>
                            <strong>${(cat.revenue || cat.total || 0).toFixed(2)}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Monthly Summary */}
                <div className={`report-card ${loading.stats ? 'loading' : ''}`}>
                  <h3>📅 {t('farmacia.reports.periodSummary')}</h3>
                  {loading.stats ? (
                    <div className="card-loading">
                      <div className="loading-spinner small"></div>
                      <span>{t('farmacia.loading.generic')}...</span>
                    </div>
                  ) : (
                    <div className="report-stats">
                      <div className="stat-item">
                        <span>{t('farmacia.reports.totalDispenses')}</span>
                        <strong>{pharmacyStats?.summary?.totalDispenses || pharmacyStats?.totalDispenses || 0}</strong>
                      </div>
                      <div className="stat-item">
                        <span>{t('farmacia.reports.totalRevenue')}</span>
                        <strong>${(pharmacyStats?.summary?.totalRevenue || pharmacyStats?.totalRevenue || 0).toFixed(2)}</strong>
                      </div>
                      <div className="stat-item">
                        <span>{t('farmacia.reports.dailyAverage')}</span>
                        <strong>${(pharmacyStats?.summary?.dailyAverage || pharmacyStats?.dailyAverage || 0).toFixed(2)}</strong>
                      </div>
                      <div className="stat-item">
                        <span>{t('farmacia.reports.restocks')}</span>
                        <strong>{pharmacyStats?.summary?.restockCount || pharmacyStats?.restockCount || 0}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alerts Summary */}
                <div className={`report-card ${loading.stats ? 'loading' : ''}`}>
                  <h3>⚠️ {t('farmacia.reports.alertsSummary')}</h3>
                  {loading.stats ? (
                    <div className="card-loading">
                      <div className="loading-spinner small"></div>
                      <span>{t('farmacia.loading.generic')}...</span>
                    </div>
                  ) : (
                    <div className="notifications-list">
                      <div className="notification-item warning">
                        <span className="notification-icon">⚠️</span>
                        <div>
                          <strong>{t('farmacia.alerts.lowStock')}</strong>
                          <p>{pharmacyStats?.alerts?.lowStock || stockAlerts.filter(a => a.type === 'STOCK_BAJO').length || lowStockCount} {t('farmacia.alerts.productsNeedRestock')}</p>
                        </div>
                      </div>
                      <div className="notification-item danger">
                        <span className="notification-icon">🔴</span>
                        <div>
                          <strong>{t('farmacia.alerts.outOfStock')}</strong>
                          <p>{pharmacyStats?.alerts?.outOfStock || stockAlerts.filter(a => a.type === 'AGOTADO').length || 0} {t('farmacia.alerts.productsOutOfStock')}</p>
                        </div>
                      </div>
                      <div className="notification-item info">
                        <span className="notification-icon">⏰</span>
                        <div>
                          <strong>{t('farmacia.alerts.expiringSoon')}</strong>
                          <p>{pharmacyStats?.alerts?.expiringSoon || stockAlerts.filter(a => a.type === 'POR_VENCER').length || 0} {t('farmacia.alerts.productsExpiringSoon')}</p>
                        </div>
                      </div>
                      <div className="notification-item expired">
                        <span className="notification-icon">☠️</span>
                        <div>
                          <strong>{t('farmacia.alerts.expired')}</strong>
                          <p>{pharmacyStats?.alerts?.expired || stockAlerts.filter(a => a.type === 'VENCIDO').length || 0} {t('farmacia.alerts.productsExpired')}</p>
                        </div>
                      </div>
                      <div className="notification-item pending">
                        <span className="notification-icon">📋</span>
                        <div>
                          <strong>{t('farmacia.alerts.pendingOrders')}</strong>
                          <p>{pendingPrescriptions.length + myTasks.length} {t('farmacia.alerts.ordersWaiting')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISPENSE DETAILS MODAL */}
        {showDispenseDetailsModal && selectedDispense && (
          <div className="modal-overlay" onClick={() => setShowDispenseDetailsModal(false)}>
            <div className="modal-content dispense-details-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📦 {t('farmacia.dispenseHistory.dispenseDetails')}</h2>
                <button className="close-btn" onClick={() => setShowDispenseDetailsModal(false)}>✕</button>
              </div>
              
              {/* Patient & Owner Info */}
              <div className="dispense-info-section">
                <h3>{t('farmacia.dispenseHistory.patientInfo')}</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">{t('farmacia.dispenseHistory.patient')}:</span>
                    <span className="value">
                      {selectedDispense.patient?.species?.toLowerCase().includes('cat') ? '🐈' : '🐕'}
                      {' '}{selectedDispense.patient?.name || selectedDispense.patientName || t('farmacia.unknown')}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('farmacia.dispenseHistory.owner')}:</span>
                    <span className="value">{selectedDispense.patient?.owner?.name || selectedDispense.ownerName || t('farmacia.unknown')}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('farmacia.dispenseHistory.phone')}:</span>
                    <span className="value">{selectedDispense.patient?.owner?.phone || selectedDispense.ownerPhone || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('farmacia.dispenseHistory.dispensedBy')}:</span>
                    <span className="value">{selectedDispense.dispensedBy?.name || selectedDispense.pharmacistName || t('farmacia.unknown')}</span>
                  </div>
                </div>
              </div>
              
              {/* Medications */}
              <div className="dispense-info-section">
                <h3>{t('farmacia.dispenseHistory.medicationsDispensed')}</h3>
                <div className="dispense-items-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('farmacia.dispenseHistory.medication')}</th>
                        <th>{t('farmacia.dispenseHistory.qty')}</th>
                        <th>{t('farmacia.dispenseHistory.unitPrice')}</th>
                        <th>{t('farmacia.dispenseHistory.subtotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDispense.items || []).map((item, index) => {
                        const unitPrice = Number(item.unitPrice || item.price || 0);
                        const qty = Number(item.dispensedQty || item.quantity || item.qty || 1);
                        return (
                          <tr key={item.id || index}>
                            <td>{item.medication?.name || item.medicationName || 'Unknown'}</td>
                            <td>{qty}</td>
                            <td>${unitPrice.toFixed(2)}</td>
                            <td>${(qty * unitPrice).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" className="total-label">Total:</td>
                        <td className="total-value">${Number(selectedDispense.total || selectedDispense.valorTotal || 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {/* Status & Notes */}
              <div className="dispense-info-section">
                <h3>Status & Notes</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${selectedDispense.status === 'COMPLETO' ? 'success' : 'warning'}`}>
                      {selectedDispense.status === 'COMPLETO' ? '✓ Complete' : '⚠ Partial'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Date/Time:</span>
                    <span className="value">
                      {selectedDispense.createdAt 
                        ? new Date(selectedDispense.createdAt).toLocaleString()
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
                {selectedDispense.notes && (
                  <div className="notes-section">
                    <span className="label">Notes:</span>
                    <p>{selectedDispense.notes}</p>
                  </div>
                )}
                {selectedDispense.partialReason && (
                  <div className="notes-section warning">
                    <span className="label">Partial Reason:</span>
                    <p>{selectedDispense.partialReason}</p>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowDispenseDetailsModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ORDER DETAILS MODAL */}
        {showOrderDetailsModal && selectedOrder && (
          <div className="modal-overlay" onClick={() => setShowOrderDetailsModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>📝 Order Details</h2>
              
              {(() => {
                const patient = systemState.pacientes.find(p => p.id === selectedOrder.pacienteId);
                return patient ? (
                  <>
                    <div className="patient-info-modal">
                      <div className="info-row">
                        <strong>Patient:</strong> {patient.nombre} ({patient.raza})
                      </div>
                      <div className="info-row">
                        <strong>Owner:</strong> {patient.propietario}
                      </div>
                      <div className="info-row">
                        <strong>Phone:</strong> <a href={`tel:${patient.telefono}`}>{patient.telefono}</a>
                      </div>
                      <div className="info-row">
                        <strong>File #:</strong> {patient.numeroFicha}
                      </div>
                    </div>

                    <div className="order-detail-section">
                      <h3>Prescribed Medications</h3>
                      <p>{selectedOrder.descripcion}</p>
                    </div>

                    <div className="order-detail-section">
                      <h3>Prescription Information</h3>
                      <div className="info-row">
                        <strong>Priority:</strong> 
                        <span className={`priority-badge ${selectedOrder.prioridad === 'ALTA' ? 'urgent' : ''}`}>
                          {selectedOrder.prioridad}
                        </span>
                      </div>
                      <div className="info-row">
                        <strong>Date:</strong> {new Date(selectedOrder.timestamp).toLocaleDateString()}
                      </div>
                      <div className="info-row">
                        <strong>Time:</strong> {new Date(selectedOrder.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </>
                ) : null;
              })()}

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowOrderDetailsModal(false)}>
                  Close
                </button>
                <button 
                  className="btn-success"
                  onClick={() => {
                    handlePrepare(selectedOrder.id, selectedOrder.pacienteId);
                    setShowOrderDetailsModal(false);
                  }}
                >
                  Prepare Medications
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD MEDICATION MODAL */}
        {showNewMedicationModal && (
          <div className="modal-overlay" onClick={() => setShowNewMedicationModal(false)}>
            <div className="modal-content large medication-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>➕ {t('farmacia.medications.addNew')}</h2>
                <button className="close-btn" onClick={() => setShowNewMedicationModal(false)}>✕</button>
              </div>
              
              <div className="medication-form">
                {/* Product Image Section */}
                <div className="form-section image-section">
                  <h3>📷 Product Image</h3>
                  <div className="image-upload-container">
                    <div className="image-preview">
                      {medicationForm.imageUrl ? (
                        <>
                          <img src={medicationForm.imageUrl} alt="Product preview" />
                          <button 
                            type="button" 
                            className="btn-remove-image"
                            onClick={handleRemoveImage}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <div className="image-placeholder-large">
                          <span>💊</span>
                          <p>No image</p>
                        </div>
                      )}
                    </div>
                    <div className="image-upload-actions">
                      <label className="btn-upload">
                        📤 Upload Image
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <span className="upload-hint">Max 2MB (JPG, PNG)</span>
                    </div>
                  </div>
                </div>

                {/* Basic Info Section */}
                <div className="form-section">
                  <h3>{t('farmacia.form.basicInfo')}</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('farmacia.form.medicationName')} *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formErrors.name ? 'error' : ''}`}
                        placeholder={t('farmacia.form.placeholders.medicationName')}
                        value={medicationForm.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                      />
                      {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                    </div>
                    <div className="form-group">
                      <label>{t('farmacia.form.genericName')}</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder={t('farmacia.form.placeholders.genericName')}
                        value={medicationForm.genericName}
                        onChange={(e) => handleFormChange('genericName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Category *</label>
                      <select 
                        className={`form-control ${formErrors.category ? 'error' : ''}`}
                        value={medicationForm.category}
                        onChange={(e) => handleFormChange('category', e.target.value)}
                      >
                        <option value="">Select a category</option>
                        {MEDICATION_CATEGORIES.filter(c => c.value).map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      {formErrors.category && <span className="error-text">{formErrors.category}</span>}
                    </div>
                    <div className="form-group">
                      <label>Presentation *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formErrors.presentation ? 'error' : ''}`}
                        placeholder="E.g.: Tablets, Syrup, Injectable"
                        value={medicationForm.presentation}
                        onChange={(e) => handleFormChange('presentation', e.target.value)}
                      />
                      {formErrors.presentation && <span className="error-text">{formErrors.presentation}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Concentration</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="E.g.: 500mg, 10ml"
                        value={medicationForm.concentration}
                        onChange={(e) => handleFormChange('concentration', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit *</label>
                      <select 
                        className={`form-control ${formErrors.unit ? 'error' : ''}`}
                        value={medicationForm.unit}
                        onChange={(e) => handleFormChange('unit', e.target.value)}
                      >
                        <option value="unit">Unit</option>
                        <option value="tablet">Tablet</option>
                        <option value="capsule">Capsule</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="mg">Milligram (mg)</option>
                        <option value="vial">Vial</option>
                        <option value="ampule">Ampule</option>
                        <option value="box">Box</option>
                        <option value="bottle">Bottle</option>
                      </select>
                      {formErrors.unit && <span className="error-text">{formErrors.unit}</span>}
                    </div>
                  </div>
                </div>

                {/* Stock Section */}
                <div className="form-section">
                  <h3>Stock Information</h3>
                  
                  <div className="form-row three-cols">
                    <div className="form-group">
                      <label>Current Stock *</label>
                      <input 
                        type="number" 
                        min="0"
                        className={`form-control ${formErrors.currentStock ? 'error' : ''}`}
                        placeholder="0"
                        value={medicationForm.currentStock}
                        onChange={(e) => handleFormChange('currentStock', parseInt(e.target.value) || 0)}
                      />
                      {formErrors.currentStock && <span className="error-text">{formErrors.currentStock}</span>}
                    </div>
                    <div className="form-group">
                      <label>Minimum Stock *</label>
                      <input 
                        type="number" 
                        min="0"
                        className={`form-control ${formErrors.minStock ? 'error' : ''}`}
                        placeholder="10"
                        value={medicationForm.minStock}
                        onChange={(e) => handleFormChange('minStock', parseInt(e.target.value) || 0)}
                      />
                      {formErrors.minStock && <span className="error-text">{formErrors.minStock}</span>}
                    </div>
                    <div className="form-group">
                      <label>Maximum Stock</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-control"
                        placeholder="100"
                        value={medicationForm.maxStock}
                        onChange={(e) => handleFormChange('maxStock', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="form-section">
                  <h3>Pricing</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cost Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className={`form-control ${formErrors.costPrice ? 'error' : ''}`}
                        placeholder="0.00"
                        value={medicationForm.costPrice}
                        onChange={(e) => handleFormChange('costPrice', parseFloat(e.target.value) || 0)}
                      />
                      {formErrors.costPrice && <span className="error-text">{formErrors.costPrice}</span>}
                    </div>
                    <div className="form-group">
                      <label>Sale Price *</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className={`form-control ${formErrors.salePrice ? 'error' : ''}`}
                        placeholder="0.00"
                        value={medicationForm.salePrice}
                        onChange={(e) => handleFormChange('salePrice', parseFloat(e.target.value) || 0)}
                      />
                      {formErrors.salePrice && <span className="error-text">{formErrors.salePrice}</span>}
                    </div>
                  </div>
                </div>

                {/* Additional Info Section */}
                <div className="form-section">
                  <h3>Additional Information</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Supplier</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="Supplier name"
                        value={medicationForm.supplier}
                        onChange={(e) => handleFormChange('supplier', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="E.g.: Shelf A-1"
                        value={medicationForm.location}
                        onChange={(e) => handleFormChange('location', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiration Date</label>
                      <input 
                        type="date" 
                        className="form-control"
                        value={medicationForm.expirationDate}
                        onChange={(e) => handleFormChange('expirationDate', e.target.value)}
                      />
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={medicationForm.requiresRefrigeration}
                          onChange={(e) => handleFormChange('requiresRefrigeration', e.target.checked)}
                        />
                        <span>❄️ Requires Refrigeration</span>
                      </label>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={medicationForm.isControlled}
                          onChange={(e) => handleFormChange('isControlled', e.target.checked)}
                        />
                        <span>⚠️ Controlled Substance</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowNewMedicationModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-success"
                  onClick={handleCreateMedication}
                  disabled={isSaving}
                >
                  {isSaving ? '⏳ Saving...' : '✅ Add to Inventory'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MEDICATION MODAL */}
        {showEditMedicationModal && selectedMedicationForEdit && (
          <div className="modal-overlay" onClick={() => setShowEditMedicationModal(false)}>
            <div className="modal-content large medication-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>✏️ Edit Medication</h2>
                <button className="close-btn" onClick={() => setShowEditMedicationModal(false)}>✕</button>
              </div>
              
              <div className="medication-form">
                {/* Product Image Section */}
                <div className="form-section image-section">
                  <h3>📷 Product Image</h3>
                  <div className="image-upload-container">
                    <div className="image-preview">
                      {medicationForm.imageUrl ? (
                        <>
                          <img src={medicationForm.imageUrl} alt="Product preview" />
                          <button 
                            type="button" 
                            className="btn-remove-image"
                            onClick={handleRemoveImage}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <div className="image-placeholder-large">
                          <span>💊</span>
                          <p>No image</p>
                        </div>
                      )}
                    </div>
                    <div className="image-upload-actions">
                      <label className="btn-upload">
                        📤 Upload Image
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <span className="upload-hint">Max 2MB (JPG, PNG)</span>
                    </div>
                  </div>
                </div>

                {/* Basic Info Section */}
                <div className="form-section">
                  <h3>Basic Information</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Medication Name *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formErrors.name ? 'error' : ''}`}
                        placeholder="E.g.: Amoxicillin 500mg"
                        value={medicationForm.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                      />
                      {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                    </div>
                    <div className="form-group">
                      <label>Generic Name</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="E.g.: Amoxicillin"
                        value={medicationForm.genericName}
                        onChange={(e) => handleFormChange('genericName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Category *</label>
                      <select 
                        className={`form-control ${formErrors.category ? 'error' : ''}`}
                        value={medicationForm.category}
                        onChange={(e) => handleFormChange('category', e.target.value)}
                      >
                        <option value="">Select a category</option>
                        {MEDICATION_CATEGORIES.filter(c => c.value).map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      {formErrors.category && <span className="error-text">{formErrors.category}</span>}
                    </div>
                    <div className="form-group">
                      <label>Presentation *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formErrors.presentation ? 'error' : ''}`}
                        placeholder="E.g.: Tablets, Syrup, Injectable"
                        value={medicationForm.presentation}
                        onChange={(e) => handleFormChange('presentation', e.target.value)}
                      />
                      {formErrors.presentation && <span className="error-text">{formErrors.presentation}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Concentration</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="E.g.: 500mg, 10ml"
                        value={medicationForm.concentration}
                        onChange={(e) => handleFormChange('concentration', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit *</label>
                      <select 
                        className={`form-control ${formErrors.unit ? 'error' : ''}`}
                        value={medicationForm.unit}
                        onChange={(e) => handleFormChange('unit', e.target.value)}
                      >
                        <option value="unit">Unit</option>
                        <option value="tablet">Tablet</option>
                        <option value="capsule">Capsule</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="mg">Milligram (mg)</option>
                        <option value="vial">Vial</option>
                        <option value="ampule">Ampule</option>
                        <option value="box">Box</option>
                        <option value="bottle">Bottle</option>
                      </select>
                      {formErrors.unit && <span className="error-text">{formErrors.unit}</span>}
                    </div>
                  </div>
                </div>

                {/* Stock Section */}
                <div className="form-section">
                  <h3>Stock Information</h3>
                  
                  <div className="form-row three-cols">
                    <div className="form-group">
                      <label>Current Stock *</label>
                      <input 
                        type="number" 
                        min="0"
                        className={`form-control ${formErrors.currentStock ? 'error' : ''}`}
                        placeholder="0"
                        value={medicationForm.currentStock}
                        onChange={(e) => handleFormChange('currentStock', parseInt(e.target.value) || 0)}
                      />
                      {formErrors.currentStock && <span className="error-text">{formErrors.currentStock}</span>}
                    </div>
                    <div className="form-group">
                      <label>Minimum Stock *</label>
                      <input 
                        type="number" 
                        min="0"
                        className={`form-control ${formErrors.minStock ? 'error' : ''}`}
                        placeholder="10"
                        value={medicationForm.minStock}
                        onChange={(e) => handleFormChange('minStock', parseInt(e.target.value) || 0)}
                      />
                      {formErrors.minStock && <span className="error-text">{formErrors.minStock}</span>}
                    </div>
                    <div className="form-group">
                      <label>Maximum Stock</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-control"
                        placeholder="100"
                        value={medicationForm.maxStock}
                        onChange={(e) => handleFormChange('maxStock', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="form-section">
                  <h3>Pricing</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cost Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className={`form-control ${formErrors.costPrice ? 'error' : ''}`}
                        placeholder="0.00"
                        value={medicationForm.costPrice}
                        onChange={(e) => handleFormChange('costPrice', parseFloat(e.target.value) || 0)}
                      />
                      {formErrors.costPrice && <span className="error-text">{formErrors.costPrice}</span>}
                    </div>
                    <div className="form-group">
                      <label>Sale Price *</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className={`form-control ${formErrors.salePrice ? 'error' : ''}`}
                        placeholder="0.00"
                        value={medicationForm.salePrice}
                        onChange={(e) => handleFormChange('salePrice', parseFloat(e.target.value) || 0)}
                      />
                      {formErrors.salePrice && <span className="error-text">{formErrors.salePrice}</span>}
                    </div>
                  </div>
                </div>

                {/* Additional Info Section */}
                <div className="form-section">
                  <h3>Additional Information</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Supplier</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="Supplier name"
                        value={medicationForm.supplier}
                        onChange={(e) => handleFormChange('supplier', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="E.g.: Shelf A-1"
                        value={medicationForm.location}
                        onChange={(e) => handleFormChange('location', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiration Date</label>
                      <input 
                        type="date" 
                        className="form-control"
                        value={medicationForm.expirationDate ? medicationForm.expirationDate.split('T')[0] : ''}
                        onChange={(e) => handleFormChange('expirationDate', e.target.value)}
                      />
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={medicationForm.requiresRefrigeration}
                          onChange={(e) => handleFormChange('requiresRefrigeration', e.target.checked)}
                        />
                        <span>❄️ Requires Refrigeration</span>
                      </label>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={medicationForm.isControlled}
                          onChange={(e) => handleFormChange('isControlled', e.target.checked)}
                        />
                        <span>⚠️ Controlled Substance</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Status</label>
                      <select 
                        className="form-control"
                        value={medicationForm.status}
                        onChange={(e) => handleFormChange('status', e.target.value)}
                      >
                        <option value="ACTIVO">Active</option>
                        <option value="INACTIVO">Inactive</option>
                        <option value="AGOTADO">Out of Stock</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions edit-actions">
                <button 
                  className="btn-danger"
                  onClick={() => setShowDeactivateConfirm(true)}
                  disabled={isSaving}
                >
                  🚫 Deactivate
                </button>
                <div className="right-actions">
                  <button className="btn-close" onClick={() => setShowEditMedicationModal(false)}>
                    Cancel
                  </button>
                  <button 
                    className="btn-success"
                    onClick={handleUpdateMedication}
                    disabled={isSaving}
                  >
                    {isSaving ? '⏳ Saving...' : '✅ Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEACTIVATE CONFIRMATION DIALOG */}
        {showDeactivateConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeactivateConfirm(false)}>
            <div className="modal-content small confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon">⚠️</div>
              <h2>{t('farmacia.modals.deactivate.title')}</h2>
              <p>
                {t('farmacia.modals.deactivate.message', { name: selectedMedicationForEdit?.nombre })}
              </p>
              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowDeactivateConfirm(false)}>
                  {t('common.cancel')}
                </button>
                <button 
                  className="btn-danger"
                  onClick={handleDeactivateMedication}
                  disabled={isSaving}
                >
                  {isSaving ? `⏳ ${t('farmacia.modals.deactivate.processing')}` : `🚫 ${t('farmacia.modals.deactivate.confirm')}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISPENSE MODAL */}
        {showDispenseModal && selectedPrescription && (
          <div className="modal-overlay" onClick={() => setShowDispenseModal(false)}>
            <div className="modal-content large dispense-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📦 {t('farmacia.modals.dispense.title')}</h2>
                <button className="close-btn" onClick={() => setShowDispenseModal(false)}>✕</button>
              </div>
              
              {/* Patient Info */}
              {(() => {
                const patient = getPatientForPrescription(selectedPrescription);
                return patient ? (
                  <div className="dispense-patient-info">
                    <div className="patient-avatar">
                      {patient.especie === 'PERRO' || patient.especie === 'Perro' ? '🐕' : '🐈'}
                    </div>
                    <div>
                      <h3>{patient.nombre}</h3>
                      <p>{patient.propietario} • {patient.numeroFicha}</p>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Medication Items */}
              <div className="dispense-items">
                <h3>{t('farmacia.modals.dispense.prescribedItems')}</h3>
                <div className="dispense-items-list">
                  {dispenseForm.items.map((item, index) => (
                    <div key={index} className={`dispense-item-row ${!item.medicationId ? 'needs-selection' : ''} ${!item.available ? 'out-of-stock' : ''}`}>
                      {/* Prescribed medication info */}
                      <div className="prescribed-info">
                        <span className="prescribed-label">📋 Prescribed:</span>
                        <span className="prescribed-name">{item.prescribedName || item.name}</span>
                        {item.dosage && <span className="prescribed-detail">{item.dosage}</span>}
                        {item.frequency && <span className="prescribed-detail">{item.frequency}</span>}
                        {item.duration && <span className="prescribed-detail">({item.duration})</span>}
                      </div>
                      
                      {/* Inventory medication selector */}
                      <div className="inventory-selection">
                        <label>📦 {t('farmacia.modals.dispense.selectFromInventory', 'Select from inventory')}:</label>
                        <select
                          className={`form-control medication-select ${!item.medicationId ? 'required' : ''}`}
                          value={item.medicationId || ''}
                          onChange={(e) => handleSelectMedication(index, e.target.value)}
                        >
                          <option value="">-- {t('farmacia.modals.dispense.selectMedication', 'Select medication')} --</option>
                          {inventory
                            .filter(m => m.status !== 'INACTIVO')
                            .map(med => (
                              <option 
                                key={med.id} 
                                value={med.id}
                                disabled={med.stock <= 0}
                              >
                                {med.nombre} {med.concentration && `(${med.concentration})`} - Stock: {med.stock} - ${Number(med.precio).toFixed(2)}
                              </option>
                            ))}
                        </select>
                        {item.medicationId && (
                          <div className="selected-med-info">
                            <span className={`stock-badge ${item.stock > 10 ? 'good' : item.stock > 0 ? 'low' : 'out'}`}>
                              Stock: {item.stock}
                            </span>
                            <span className="price-badge">${Number(item.unitPrice).toFixed(2)}/u</span>
                          </div>
                        )}
                        {!item.medicationId && (
                          <span className="selection-warning">⚠️ {t('farmacia.modals.dispense.mustSelectMed', 'Must select a medication')}</span>
                        )}
                      </div>
                      
                      {/* Quantity controls */}
                      <div className="dispense-qty-controls">
                        <div className="qty-group">
                          <label>{t('farmacia.modals.dispense.requested')}:</label>
                          <span className="qty-value">{item.requestedQty}</span>
                        </div>
                        <div className="qty-group">
                          <label>{t('farmacia.modals.dispense.dispenseQty')}:</label>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(item.requestedQty, item.stock || 0)}
                            value={item.dispensedQty}
                            onChange={(e) => handleDispenseQtyChange(index, e.target.value)}
                            className="qty-input"
                            disabled={!item.medicationId || !item.available}
                          />
                        </div>
                        <div className="qty-group subtotal">
                          <label>{t('farmacia.modals.dispense.subtotal')}:</label>
                          <span className="subtotal-value">${(item.dispensedQty * item.unitPrice).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total */}
                <div className="dispense-total">
                  <strong>{t('farmacia.modals.dispense.total')}:</strong>
                  <span className="total-value">${calculateDispenseTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Partial Dispense Reason */}
              {isPartialDispense() && (
                <div className="form-group partial-reason">
                  <label>⚠️ {t('farmacia.modals.dispense.partialReason')}</label>
                  <select
                    className="form-control"
                    value={dispenseForm.partialReason}
                    onChange={(e) => setDispenseForm({ ...dispenseForm, partialReason: e.target.value })}
                  >
                    <option value="">{t('farmacia.modals.dispense.selectReason')}</option>
                    <option value="Insufficient stock">{t('farmacia.modals.dispense.insufficientStock')}</option>
                    <option value="Owner requested partial">{t('farmacia.modals.dispense.ownerRequestedPartial')}</option>
                    <option value="Medication on backorder">{t('farmacia.modals.dispense.medicationOnBackorder')}</option>
                    <option value="Other">{t('farmacia.modals.dispense.other')}</option>
                  </select>
                </div>
              )}

              {/* Delivered To */}
              <div className="form-group">
                <label>{t('farmacia.modals.dispense.deliveredTo')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('farmacia.modals.dispense.deliveredToPlaceholder')}
                  value={dispenseForm.deliveredTo}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, deliveredTo: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>{t('farmacia.modals.dispense.notes')}</label>
                <textarea
                  className="form-control"
                  placeholder={t('farmacia.modals.dispense.notesPlaceholder')}
                  value={dispenseForm.notes}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowDispenseModal(false)}>
                  {t('common.cancel')}
                </button>
                <button 
                  className="btn-success"
                  onClick={handleSubmitDispense}
                  disabled={preparingMeds[selectedPrescription.id]}
                >
                  {preparingMeds[selectedPrescription.id] 
                    ? `⏳ ${t('farmacia.modals.dispense.processing')}` 
                    : `✅ ${isPartialDispense() ? t('farmacia.modals.dispense.confirmPartial') : t('farmacia.modals.dispense.confirmDispense')} - $${calculateDispenseTotal().toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT PRESCRIPTION MODAL */}
        {showRejectModal && selectedPrescription && (
          <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="modal-content reject-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>❌ {t('farmacia.modals.reject.title')}</h2>
                <button className="close-btn" onClick={() => setShowRejectModal(false)}>✕</button>
              </div>
              
              {/* Patient Info */}
              {(() => {
                const patient = getPatientForPrescription(selectedPrescription);
                return patient ? (
                  <div className="reject-patient-info">
                    <p>{t('farmacia.modals.reject.patientLabel')}: <strong>{patient.nombre}</strong></p>
                    <p>{t('farmacia.modals.reject.ownerLabel')}: <strong>{patient.propietario}</strong></p>
                  </div>
                ) : null;
              })()}

              <div className="reject-warning">
                <span className="warning-icon">⚠️</span>
                <p>{t('farmacia.modals.reject.warning')}</p>
              </div>

              {/* Rejection Reason */}
              <div className="form-group">
                <label>{t('farmacia.modals.reject.reasonLabel')}</label>
                <select
                  className="form-control"
                  value={rejectForm.reason}
                  onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
                >
                  <option value="">{t('farmacia.modals.reject.selectReason')}</option>
                  <option value="Sin stock">{t('farmacia.modals.reject.outOfStock')}</option>
                  <option value="Dosis incorrecta">{t('farmacia.modals.reject.incorrectDosage')}</option>
                  <option value="Requiere aclaración">{t('farmacia.modals.reject.requiresClarification')}</option>
                  <option value="Contraindicación detectada">{t('farmacia.modals.reject.contraindicationDetected')}</option>
                  <option value="Medicamento descontinuado">{t('farmacia.modals.reject.medicationDiscontinued')}</option>
                  <option value="Otro">{t('farmacia.modals.reject.other')}</option>
                </select>
              </div>

              {/* Additional Notes */}
              <div className="form-group">
                <label>{t('farmacia.modals.reject.notesLabel')}</label>
                <textarea
                  className="form-control"
                  placeholder={t('farmacia.modals.reject.notesPlaceholder')}
                  value={rejectForm.notes}
                  onChange={(e) => setRejectForm({ ...rejectForm, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowRejectModal(false)}>
                  {t('common.cancel')}
                </button>
                <button 
                  className="btn-danger"
                  onClick={handleSubmitReject}
                  disabled={!rejectForm.reason}
                >
                  ❌ {t('farmacia.modals.reject.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADJUST STOCK MODAL */}
        {showAdjustStockModal && selectedMedicationForStock && (
          <div className="modal-overlay" onClick={() => setShowAdjustStockModal(false)}>
            <div className="modal-content stock-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📝 {t('farmacia.modals.adjustStock.title')}</h2>
                <button className="close-btn" onClick={() => setShowAdjustStockModal(false)}>✕</button>
              </div>
              
              <div className="medication-info-banner">
                <h3>{selectedMedicationForStock.nombre}</h3>
                <p>{selectedMedicationForStock.categoria} • {selectedMedicationForStock.presentation || 'N/A'}</p>
              </div>

              <div className="current-stock-display">
                <span>{t('farmacia.modals.adjustStock.currentStock')}:</span>
                <strong className={selectedMedicationForStock.stock <= selectedMedicationForStock.minimo ? 'text-danger' : 'text-success'}>
                  {selectedMedicationForStock.stock} {selectedMedicationForStock.unit || t('farmacia.reports.units')}
                </strong>
              </div>

              <div className="form-group">
                <label>{t('farmacia.modals.adjustStock.adjustmentType')}</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input 
                      type="radio"
                      name="adjustmentType"
                      value="add"
                      checked={adjustStockForm.adjustmentType === 'add'}
                      onChange={(e) => setAdjustStockForm({ ...adjustStockForm, adjustmentType: e.target.value })}
                    />
                    <span className="radio-custom add">➕ {t('farmacia.modals.adjustStock.addStock')}</span>
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio"
                      name="adjustmentType"
                      value="remove"
                      checked={adjustStockForm.adjustmentType === 'remove'}
                      onChange={(e) => setAdjustStockForm({ ...adjustStockForm, adjustmentType: e.target.value })}
                    />
                    <span className="radio-custom remove">➖ {t('farmacia.modals.adjustStock.removeStock')}</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('farmacia.modals.adjustStock.quantity')} *</label>
                  <input 
                    type="number"
                    min="1"
                    className={`form-control ${adjustStockErrors.quantity ? 'error' : ''}`}
                    placeholder={t('farmacia.modals.adjustStock.quantityPlaceholder')}
                    value={adjustStockForm.quantity}
                    onChange={(e) => setAdjustStockForm({ ...adjustStockForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                  {adjustStockErrors.quantity && <span className="error-text">{adjustStockErrors.quantity}</span>}
                </div>
                <div className="form-group">
                  <label>{t('farmacia.modals.adjustStock.batchNumber')}</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder={t('farmacia.modals.adjustStock.optional')}
                    value={adjustStockForm.batchNumber}
                    onChange={(e) => setAdjustStockForm({ ...adjustStockForm, batchNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('farmacia.modals.adjustStock.reason')} *</label>
                <textarea
                  className={`form-control ${adjustStockErrors.reason ? 'error' : ''}`}
                  placeholder={t('farmacia.modals.adjustStock.reasonPlaceholder')}
                  value={adjustStockForm.reason}
                  onChange={(e) => setAdjustStockForm({ ...adjustStockForm, reason: e.target.value })}
                  rows={2}
                />
                {adjustStockErrors.reason && <span className="error-text">{adjustStockErrors.reason}</span>}
              </div>

              <div className="stock-preview">
                <div className="preview-row">
                  <span>{t('farmacia.modals.adjustStock.preview.current')}:</span>
                  <span>{selectedMedicationForStock.stock}</span>
                </div>
                <div className="preview-row">
                  <span>{adjustStockForm.adjustmentType === 'add' ? t('farmacia.modals.adjustStock.preview.adding') : t('farmacia.modals.adjustStock.preview.removing')}:</span>
                  <span className={adjustStockForm.adjustmentType === 'add' ? 'text-success' : 'text-danger'}>
                    {adjustStockForm.adjustmentType === 'add' ? '+' : '-'}{adjustStockForm.quantity || 0}
                  </span>
                </div>
                <div className="preview-row total">
                  <span>{t('farmacia.modals.adjustStock.preview.newStock')}:</span>
                  <span className={calculateNewStock() < 0 ? 'text-danger' : calculateNewStock() <= selectedMedicationForStock.minimo ? 'text-warning' : 'text-success'}>
                    {calculateNewStock()}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowAdjustStockModal(false)}>
                  {t('common.cancel')}
                </button>
                <button 
                  className="btn-success"
                  onClick={handleSubmitAdjustStock}
                  disabled={isSaving}
                >
                  {isSaving ? `⏳ ${t('farmacia.modals.adjustStock.saving')}` : `✅ ${t('farmacia.modals.adjustStock.confirm')}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESTOCK MODAL */}
        {showRestockModal && selectedMedicationForStock && (
          <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
            <div className="modal-content stock-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>➕ {t('farmacia.modals.restock.title')}</h2>
                <button className="close-btn" onClick={() => setShowRestockModal(false)}>✕</button>
              </div>
              
              <div className="medication-info-banner">
                <h3>{selectedMedicationForStock.nombre}</h3>
                <p>{selectedMedicationForStock.categoria} • Current Stock: <strong>{selectedMedicationForStock.stock}</strong></p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity to Add *</label>
                  <input 
                    type="number"
                    min="1"
                    className={`form-control ${restockErrors.quantity ? 'error' : ''}`}
                    placeholder="Enter quantity"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm({ ...restockForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                  {restockErrors.quantity && <span className="error-text">{restockErrors.quantity}</span>}
                </div>
                <div className="form-group">
                  <label>Batch Number *</label>
                  <input 
                    type="text"
                    className={`form-control ${restockErrors.batchNumber ? 'error' : ''}`}
                    placeholder="e.g., LOT-2026-001"
                    value={restockForm.batchNumber}
                    onChange={(e) => setRestockForm({ ...restockForm, batchNumber: e.target.value })}
                  />
                  {restockErrors.batchNumber && <span className="error-text">{restockErrors.batchNumber}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expiration Date *</label>
                  <input 
                    type="date"
                    className={`form-control ${restockErrors.expirationDate ? 'error' : ''}`}
                    value={restockForm.expirationDate}
                    onChange={(e) => setRestockForm({ ...restockForm, expirationDate: e.target.value })}
                  />
                  {restockErrors.expirationDate && <span className="error-text">{restockErrors.expirationDate}</span>}
                </div>
                <div className="form-group">
                  <label>Cost Price per Unit</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={restockForm.costPrice}
                    onChange={(e) => setRestockForm({ ...restockForm, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Supplier</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Supplier name"
                    value={restockForm.supplier}
                    onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Optional"
                    value={restockForm.invoiceNumber}
                    onChange={(e) => setRestockForm({ ...restockForm, invoiceNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="stock-preview restock">
                <div className="preview-row">
                  <span>Current Stock:</span>
                  <span>{selectedMedicationForStock.stock}</span>
                </div>
                <div className="preview-row">
                  <span>Adding:</span>
                  <span className="text-success">+{restockForm.quantity || 0}</span>
                </div>
                <div className="preview-row total">
                  <span>New Stock:</span>
                  <span className="text-success">
                    {(selectedMedicationForStock.stock || 0) + (restockForm.quantity || 0)}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowRestockModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-success"
                  onClick={handleSubmitRestock}
                  disabled={isSaving}
                >
                  {isSaving ? '⏳ Processing...' : '✅ Confirm Restock'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STOCK HISTORY MODAL */}
        {showStockHistoryModal && selectedMedicationForStock && (
          <div className="modal-overlay" onClick={() => setShowStockHistoryModal(false)}>
            <div className="modal-content large stock-history-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📊 {t('farmacia.modals.stockHistory.title')}</h2>
                <button className="close-btn" onClick={() => setShowStockHistoryModal(false)}>✕</button>
              </div>
              
              <div className="medication-info-banner">
                <h3>{selectedMedicationForStock.nombre}</h3>
                <p>Current Stock: <strong>{selectedMedicationForStock.stock}</strong> {selectedMedicationForStock.unit || 'units'}</p>
              </div>

              <div className="history-filters">
                <div className="filter-group">
                  <label>From:</label>
                  <input 
                    type="date"
                    className="form-control"
                    value={stockHistoryFilters.startDate}
                    onChange={(e) => handleStockHistoryFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>To:</label>
                  <input 
                    type="date"
                    className="form-control"
                    value={stockHistoryFilters.endDate}
                    onChange={(e) => handleStockHistoryFilterChange('endDate', e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>Type:</label>
                  <select 
                    className="form-control"
                    value={stockHistoryFilters.type}
                    onChange={(e) => handleStockHistoryFilterChange('type', e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="ENTRADA">Entry</option>
                    <option value="SALIDA">Exit</option>
                    <option value="AJUSTE">Adjustment</option>
                    <option value="DISPENSA">Dispensed</option>
                    <option value="VENCIDO">Expired</option>
                    <option value="PERDIDA">Loss</option>
                  </select>
                </div>
              </div>

              <div className="history-table-container">
                {loading.action ? (
                  <div className="loading-state">
                    <span className="spinner">⏳</span>
                    <p>Loading history...</p>
                  </div>
                ) : stockMovements.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <p>No stock movements found for this period</p>
                  </div>
                ) : (
                  <table className="data-table stock-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Stock Change</th>
                        <th>Reason</th>
                        <th>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockMovements.map((movement, idx) => {
                        const typeInfo = getMovementTypeInfo(movement.type || movement.tipo);
                        return (
                          <tr key={movement.id || idx}>
                            <td>{new Date(movement.createdAt || movement.fecha).toLocaleDateString()}</td>
                            <td>
                              <span 
                                className="movement-type-badge"
                                style={{ backgroundColor: typeInfo.color }}
                              >
                                {typeInfo.icon} {typeInfo.label}
                              </span>
                            </td>
                            <td className={movement.quantity > 0 ? 'text-success' : 'text-danger'}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity || movement.cantidad}
                            </td>
                            <td>
                              {movement.previousStock ?? '?'} → {movement.newStock ?? '?'}
                            </td>
                            <td className="reason-cell">{movement.reason || movement.motivo || '-'}</td>
                            <td>{movement.user?.name || movement.usuario || 'System'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowStockHistoryModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MARK AS EXPIRED MODAL */}
        {showMarkExpiredModal && selectedMedicationForStock && (
          <div className="modal-overlay" onClick={() => setShowMarkExpiredModal(false)}>
            <div className="modal-content stock-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>⚠️ {t('farmacia.modals.markExpired.title')}</h2>
                <button className="close-btn" onClick={() => setShowMarkExpiredModal(false)}>✕</button>
              </div>
              
              <div className="medication-info-banner expired">
                <h3>{selectedMedicationForStock.nombre}</h3>
                <p>
                  {selectedMedicationForStock.expirationDate && (
                    <>Expired: {new Date(selectedMedicationForStock.expirationDate).toLocaleDateString()}</>
                  )}
                </p>
              </div>

              <div className="expired-warning-box">
                <span className="warning-icon">☠️</span>
                <p>This will remove units from stock and create an EXPIRED alert. This action cannot be undone.</p>
              </div>

              <div className="current-stock-display">
                <span>Current Stock:</span>
                <strong>{selectedMedicationForStock.stock} {selectedMedicationForStock.unit || 'units'}</strong>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity to Mark as Expired *</label>
                  <input 
                    type="number"
                    min="1"
                    max={selectedMedicationForStock.stock}
                    className={`form-control ${markExpiredErrors.quantity ? 'error' : ''}`}
                    placeholder="Enter quantity"
                    value={markExpiredForm.quantity}
                    onChange={(e) => setMarkExpiredForm({ ...markExpiredForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                  {markExpiredErrors.quantity && <span className="error-text">{markExpiredErrors.quantity}</span>}
                </div>
                <div className="form-group">
                  <label>Batch Number</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="If known"
                    value={markExpiredForm.batchNumber}
                    onChange={(e) => setMarkExpiredForm({ ...markExpiredForm, batchNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  placeholder="Additional notes about the expiration..."
                  value={markExpiredForm.notes}
                  onChange={(e) => setMarkExpiredForm({ ...markExpiredForm, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="stock-preview expired">
                <div className="preview-row">
                  <span>Current Stock:</span>
                  <span>{selectedMedicationForStock.stock}</span>
                </div>
                <div className="preview-row">
                  <span>Marking Expired:</span>
                  <span className="text-danger">-{markExpiredForm.quantity || 0}</span>
                </div>
                <div className="preview-row total">
                  <span>Remaining Stock:</span>
                  <span>{(selectedMedicationForStock.stock || 0) - (markExpiredForm.quantity || 0)}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowMarkExpiredModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-danger"
                  onClick={handleSubmitMarkExpired}
                  disabled={isSaving}
                >
                  {isSaving ? '⏳ Processing...' : '☠️ Confirm Expired'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESOLVE ALERT MODAL */}
        {showResolveAlertModal && selectedAlert && (
          <div className="modal-overlay" onClick={() => setShowResolveAlertModal(false)}>
            <div className="modal-content resolve-alert-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>✓ {t('farmacia.modals.resolveAlert.title')}</h2>
                <button className="close-btn" onClick={() => setShowResolveAlertModal(false)}>✕</button>
              </div>
              
              <div className={`alert-info-banner ${selectedAlert.type?.toLowerCase()}`}>
                <div className="alert-type-icon">{getAlertTypeIcon(selectedAlert.type)}</div>
                <div className="alert-info-content">
                  <h3>{selectedAlert.medication?.name || selectedAlert.medicationName || 'Unknown'}</h3>
                  <p className="alert-type">{getAlertTypeLabel(selectedAlert.type)}</p>
                  <span className={`priority-badge ${getPriorityClass(selectedAlert.priority)}`}>
                    {selectedAlert.priority || 'BAJA'}
                  </span>
                </div>
              </div>

              <div className="alert-details">
                {(selectedAlert.type === 'STOCK_BAJO' || selectedAlert.type === 'AGOTADO') && (
                  <div className="detail-row">
                    <span>Current Stock:</span>
                    <strong className="text-danger">{selectedAlert.currentStock ?? 0}</strong>
                    <span>/ Min: {selectedAlert.minStock ?? 10}</span>
                  </div>
                )}
                
                {(selectedAlert.type === 'POR_VENCER' || selectedAlert.type === 'VENCIDO') && selectedAlert.expirationDate && (
                  <div className="detail-row">
                    <span>Expiration Date:</span>
                    <strong className={selectedAlert.type === 'VENCIDO' ? 'text-danger' : 'text-warning'}>
                      {new Date(selectedAlert.expirationDate).toLocaleDateString()}
                    </strong>
                  </div>
                )}
                
                <div className="detail-row">
                  <span>Created:</span>
                  <strong>{new Date(selectedAlert.createdAt).toLocaleString()}</strong>
                </div>
                
                {selectedAlert.message && (
                  <div className="detail-row">
                    <span>Message:</span>
                    <strong>{selectedAlert.message}</strong>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Resolution</label>
                <div className="radio-group resolution-options">
                  <label className="radio-label">
                    <input 
                      type="radio"
                      name="resolution"
                      value="RESUELTA"
                      checked={resolveAlertForm.resolution === 'RESUELTA'}
                      onChange={() => setResolveAlertForm({ ...resolveAlertForm, resolution: 'RESUELTA' })}
                    />
                    <span className="radio-custom resolved">✅ Resolved</span>
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio"
                      name="resolution"
                      value="IGNORADA"
                      checked={resolveAlertForm.resolution === 'IGNORADA'}
                      onChange={() => handleResolutionChange('IGNORADA')}
                    />
                    <span className="radio-custom ignored">🚫 Ignore</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Notes {resolveAlertForm.resolution === 'IGNORADA' && '*'}</label>
                <textarea
                  className={`form-control ${resolveAlertErrors.notes ? 'error' : ''}`}
                  placeholder={resolveAlertForm.resolution === 'IGNORADA' 
                    ? 'Required: Explain why this alert is being ignored...' 
                    : 'Optional notes about the resolution...'}
                  value={resolveAlertForm.notes}
                  onChange={(e) => setResolveAlertForm({ ...resolveAlertForm, notes: e.target.value })}
                  rows={3}
                />
                {resolveAlertErrors.notes && <span className="error-text">{resolveAlertErrors.notes}</span>}
              </div>

              {resolveAlertForm.resolution === 'IGNORADA' && (
                <div className="ignore-warning">
                  <span className="warning-icon">⚠️</span>
                  <p>Ignoring this alert means no action will be taken. The medication may remain at risk.</p>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-close" onClick={() => setShowResolveAlertModal(false)}>
                  Cancel
                </button>
                <button 
                  className={resolveAlertForm.resolution === 'RESUELTA' ? 'btn-success' : 'btn-warning'}
                  onClick={handleSubmitResolveAlert}
                  disabled={isSaving}
                >
                  {isSaving 
                    ? '⏳ Processing...' 
                    : resolveAlertForm.resolution === 'RESUELTA' 
                      ? '✅ Mark as Resolved' 
                      : '🚫 Confirm Ignore'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IGNORE CONFIRMATION DIALOG */}
        {showIgnoreConfirm && (
          <div className="modal-overlay" onClick={() => setShowIgnoreConfirm(false)}>
            <div className="modal-content small confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon">⚠️</div>
              <h2>{t('farmacia.alerts.ignoreConfirm')}</h2>
              <p>
                {t('farmacia.alerts.ignoreConfirmMsg')}
              </p>
              <p><strong>{t('farmacia.alerts.notes')}</strong></p>
              <div className="modal-actions">
                <button 
                  className="btn-close" 
                  onClick={() => {
                    setShowIgnoreConfirm(false);
                    setResolveAlertForm({ ...resolveAlertForm, resolution: 'RESUELTA' });
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  className="btn-warning"
                  onClick={() => setShowIgnoreConfirm(false)}
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GENERIC CONFIRMATION DIALOG */}
        {confirmDialog.show && (
          <div className="confirm-dialog-overlay" onClick={closeConfirmDialog}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <h3>
                {confirmDialog.type === 'danger' && '⚠️ '}
                {confirmDialog.type === 'warning' && '⚡ '}
                {confirmDialog.title}
              </h3>
              <p>{confirmDialog.message}</p>
              <div className="confirm-dialog-actions">
                <button className="btn-cancel" onClick={closeConfirmDialog}>
                  {t('common.cancel')}
                </button>
                <button 
                  className={`btn-confirm ${confirmDialog.type}`}
                  onClick={handleConfirmAction}
                >
                  {t('common.confirm')}
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

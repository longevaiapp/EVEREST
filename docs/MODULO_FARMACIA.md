# 💊 Módulo Farmacia - VET-OS (EVEREST)

## Documentación Técnica Completa

**Fecha:** Enero 21, 2026  
**Versión:** 2.1 (Segunda revisión exhaustiva Senior Dev)  
**Archivo fuente:** `src/components/dashboards/FarmaciaDashboard.jsx` (767 líneas)

---

## 📋 Índice

1. [Propósito del Módulo](#propósito-del-módulo)
2. [Entidades que Maneja](#entidades-que-maneja)
3. [Estados del Sistema](#estados-del-sistema)
4. [Funciones Principales](#funciones-principales)
5. [Formularios y Modales](#formularios-y-modales)
6. [Secciones de la UI](#secciones-de-la-ui)
7. [Funciones del Contexto](#funciones-del-contexto)
8. [Variables de Estado](#variables-de-estado)
9. [Datos Computados](#datos-computados)
10. [Interacciones con Otros Módulos](#interacciones-con-otros-módulos)
11. [Permisos de Base de Datos](#permisos-de-base-de-datos)
12. [Inventario Mock](#inventario-mock)
13. [Notas de Implementación](#notas-de-implementación)

---

## Propósito del Módulo

**Farmacia** gestiona todo lo relacionado con medicamentos. Es responsable de:

- ✅ Recibir y despachar prescripciones médicas
- ✅ Gestionar el inventario de medicamentos
- ✅ Controlar stock mínimo y máximo
- ✅ Alertar sobre medicamentos por vencer
- ✅ Registrar movimientos de inventario
- ✅ Notificar a Recepción cuando medicamentos están listos

---

## Entidades que Maneja

### 1. Medication (Inventario de Medicamentos)

Catálogo de medicamentos en inventario. Farmacia es **dueño** de esta entidad.

```typescript
interface Medication {
  id: string;                    // ID único (cuid)
  
  // Identificación
  name: string;                  // Nombre comercial
  genericName?: string;          // Nombre genérico
  category: MedicationCategory;  // Categoría
  
  // Presentación
  presentation: string;          // Tabletas, jarabe, inyectable, etc.
  concentration?: string;        // Concentración (ej: "500mg")
  unit: string;                  // Unidad de medida (tableta, ml, ampolla)
  
  // Stock
  currentStock: number;          // Stock actual
  minStock: number;              // Stock mínimo (para alertas)
  maxStock?: number;             // Stock máximo
  location?: string;             // Ubicación en farmacia (estante A, refrigerador)
  
  // Control
  requiresRefrigeration: boolean; // ¿Requiere refrigeración?
  isControlled: boolean;          // ¿Es medicamento controlado?
  
  // Costos
  costPrice?: number;            // Precio de compra
  salePrice: number;             // Precio de venta
  
  // Fechas
  expirationDate: Date;          // Fecha de caducidad más próxima
  lastRestocked?: Date;          // Última reposición
  
  // Proveedor
  supplier?: string;             // Nombre del proveedor
  supplierCode?: string;         // Código del proveedor
  
  createdAt: Date;
  updatedAt: Date;
}

type MedicationCategory = 
  | 'ANTIBIOTICO'            // Antibióticos
  | 'ANALGESICO'             // Analgésicos
  | 'ANTIINFLAMATORIO'       // Antiinflamatorios
  | 'ANTIPARASITARIO'        // Antiparasitarios
  | 'VACUNA'                 // Vacunas
  | 'VITAMINA'               // Vitaminas y suplementos
  | 'SUERO'                  // Sueros y fluidos
  | 'ANESTESICO'             // Anestésicos
  | 'DERMATOLOGICO'          // Productos dermatológicos
  | 'OFTALMICO'              // Productos oftálmicos
  | 'CARDIACO'               // Cardíacos
  | 'HORMONAL'               // Hormonales
  | 'OTRO';                  // Otros
```

**Campos requeridos:** `name`, `category`, `presentation`, `unit`, `currentStock`, `minStock`, `salePrice`, `expirationDate`  
**Campos opcionales:** `genericName`, `concentration`, `maxStock`, `location`, `costPrice`, `supplier`, `supplierCode`

---

### 2. Dispense (Despacho)

Registro de despacho de medicamentos. Farmacia es **dueño** de esta entidad.

```typescript
interface Dispense {
  id: string;                    // ID único (cuid)
  prescriptionId: string;        // FK → Prescription
  petId: string;                 // FK → Pet
  
  // Despacho
  dispensedBy: string;           // FK → User (farmacéutico)
  dispensedAt: Date;             // Fecha/hora de despacho
  status: DispenseStatus;
  
  // Items despachados
  items: DispenseItem[];
  
  // Entrega
  notes?: string;                // Notas del despacho
  deliveredTo: string;           // Nombre de quien recibe
  signature?: string;            // Firma de recibido (base64)
  
  createdAt: Date;
}

interface DispenseItem {
  medicationId: string;          // FK → Medication
  medicationName: string;        // Nombre (desnormalizado para historial)
  requestedQty: number;          // Cantidad solicitada en receta
  dispensedQty: number;          // Cantidad realmente despachada
  reason?: string;               // Razón si es diferente (sin stock, etc.)
  unitPrice: number;             // Precio unitario al momento del despacho
  subtotal: number;              // Subtotal del item
}

type DispenseStatus = 
  | 'PENDIENTE'              // Esperando ser despachado
  | 'COMPLETO'               // Todo despachado
  | 'PARCIAL';               // Despacho parcial (falta stock)
```

**Campos requeridos:** `prescriptionId`, `petId`, `dispensedBy`, `items`, `deliveredTo`  
**Campos opcionales:** `notes`, `signature`

---

### 3. StockMovement (Movimiento de Inventario)

Historial de movimientos de inventario. Farmacia es **dueño** de esta entidad.

```typescript
interface StockMovement {
  id: string;                    // ID único (cuid)
  medicationId: string;          // FK → Medication
  
  // Tipo de movimiento
  type: MovementType;
  quantity: number;              // Cantidad (positiva o negativa según tipo)
  
  // Stock antes/después
  previousStock: number;         // Stock antes del movimiento
  newStock: number;              // Stock después del movimiento
  
  // Detalles
  reason?: string;               // Razón del movimiento
  reference?: string;            // Referencia (prescriptionId, # orden compra)
  batchNumber?: string;          // Número de lote (para entradas)
  expirationDate?: Date;         // Fecha de caducidad (para entradas)
  
  // Auditoría
  performedBy: string;           // FK → User
  performedAt: Date;
}

type MovementType = 
  | 'ENTRADA'                // Compra/reposición de stock
  | 'SALIDA'                 // Despacho de receta
  | 'AJUSTE'                 // Ajuste de inventario
  | 'DEVOLUCION'             // Devolución de medicamento
  | 'VENCIDO'                // Baja por vencimiento
  | 'MERMA';                 // Pérdida/daño
```

**Campos requeridos:** `medicationId`, `type`, `quantity`, `previousStock`, `newStock`, `performedBy`  
**Campos opcionales:** `reason`, `reference`, `batchNumber`, `expirationDate`

---

### 4. StockAlert (Alerta de Stock)

Alertas automáticas de inventario. Farmacia es **dueño** de esta entidad.

```typescript
interface StockAlert {
  id: string;                    // ID único (cuid)
  medicationId: string;          // FK → Medication
  
  // Alerta
  type: AlertType;
  message: string;               // Descripción de la alerta
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  
  // Estado
  status: AlertStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;           // FK → User
  resolutionNotes?: string;      // Notas de resolución
}

type AlertType = 
  | 'STOCK_BAJO'             // Stock por debajo del mínimo
  | 'AGOTADO'                // Stock en cero
  | 'POR_VENCER'             // Próximo a vencer (30 días)
  | 'VENCIDO';               // Ya venció

type AlertStatus = 
  | 'ACTIVA'                 // Alerta activa
  | 'RESUELTA'               // Alerta resuelta
  | 'IGNORADA';              // Alerta ignorada (con justificación)
```

**Campos requeridos:** `medicationId`, `type`, `message`, `priority`  
**Campos opcionales:** `resolvedAt`, `resolvedBy`, `resolutionNotes`

---

### 5. PurchaseOrder (Orden de Compra) - Futuro

Órdenes de compra a proveedores. Farmacia es **dueño** de esta entidad.

```typescript
interface PurchaseOrder {
  id: string;                    // ID único (cuid)
  
  // Proveedor
  supplier: string;              // Nombre del proveedor
  supplierContact?: string;      // Contacto del proveedor
  
  // Items
  items: PurchaseOrderItem[];
  totalAmount: number;           // Monto total
  
  // Estado
  status: PurchaseOrderStatus;
  
  // Fechas
  createdBy: string;             // FK → User
  createdAt: Date;
  sentAt?: Date;                 // Fecha de envío al proveedor
  expectedDelivery?: Date;       // Fecha esperada de entrega
  receivedAt?: Date;             // Fecha de recepción
  receivedBy?: string;           // FK → User
  
  notes?: string;
}

interface PurchaseOrderItem {
  medicationId: string;          // FK → Medication
  medicationName: string;        // Nombre del medicamento
  quantity: number;              // Cantidad solicitada
  unitCost: number;              // Costo unitario
  subtotal: number;              // Subtotal
  receivedQty?: number;          // Cantidad recibida
}

type PurchaseOrderStatus = 
  | 'BORRADOR'               // En preparación
  | 'PENDIENTE'              // Lista para enviar
  | 'ENVIADA'                // Enviada al proveedor
  | 'PARCIAL'                // Recibida parcialmente
  | 'RECIBIDA'               // Completamente recibida
  | 'CANCELADA';             // Cancelada
```

**Nota:** Esta entidad es para implementación futura.

---

## Estados del Sistema

### Estados de Paciente que GESTIONA Farmacia

| Estado del Paciente | Acción de Farmacia |
|---------------------|-------------------|
| `EN_FARMACIA` | **LEE** - Ve pacientes con recetas pendientes |
| `LISTO_PARA_ALTA` | **CREA** - Cuando despacha completamente |

### Estados de Prescripción que MODIFICA Farmacia

| Estado Prescripción | Cuándo se usa |
|---------------------|---------------|
| `PENDIENTE` | **LEE** - Receta llega del médico |
| `DESPACHADA` | **CREA** - Al completar despacho total |
| `PARCIAL` | **CREA** - Si no hay stock completo |

---

## Funciones Principales (Implementadas en el Código)

### 1. Preparar y Entregar Medicamentos

```typescript
handlePrepare(taskId: string, patientId: string): void
```

**Flujo:**
1. Activa estado de preparación: `preparingMeds[taskId] = true`
2. Simula tiempo de preparación (1500ms setTimeout)
3. Llama a `completeTask('FARMACIA', taskId)` para eliminar tarea
4. Llama a `deliverMedication(patientId)` para:
   - Cambiar estado del paciente a `LISTO_PARA_ALTA`
   - Enviar notificación a Recepción
5. Desactiva estado de preparación
6. Muestra alerta: "Medicamentos preparados y entregados"

**Código real:**
```javascript
const handlePrepare = (taskId, patientId) => {
  setPreparingMeds({ ...preparingMeds, [taskId]: true });
  
  setTimeout(() => {
    completeTask('FARMACIA', taskId);
    deliverMedication(patientId);
    setPreparingMeds({ ...preparingMeds, [taskId]: false });
    alert('Medicamentos preparados y entregados');
  }, 1500);
};
```

---

### 2. Ver Detalles de Orden

```typescript
handleViewOrderDetails(task: Task): void
```

**Flujo:**
1. Guarda la tarea seleccionada en `selectedOrder`
2. Abre modal `showOrderDetailsModal`
3. Muestra información completa del paciente y receta

---

### 3. Contar Stock Bajo

```typescript
getLowStockCount(): number
```

**Flujo:**
1. Filtra inventario donde `stock <= minimo`
2. Retorna cantidad de productos con stock bajo

**Código real:**
```javascript
const getLowStockCount = () => {
  return inventory.filter(item => item.stock <= item.minimo).length;
};
```

---

### 4. Búsqueda de Inventario

```typescript
// Filtro reactivo (no es función, es computed)
const filteredInventory = inventory.filter(item =>
  item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
  item.categoria.toLowerCase().includes(searchQuery.toLowerCase())
);
```

**Busca por:**
- Nombre del medicamento
- Categoría

---

## Funciones Planificadas (No Implementadas)

> ⚠️ Las siguientes funciones están en la documentación original pero **NO están implementadas** en el código actual:

| Función | Descripción | Estado |
|---------|-------------|--------|
| `handleDispensePrescription` | Despachar receta completa | ❌ No implementada |
| `handlePartialDispense` | Despacho parcial | ❌ No implementada |
| `handleRejectPrescription` | Rechazar receta | ❌ No implementada |
| `handleAddStock` | Agregar stock | ❌ Solo UI, sin lógica |
| `handleAdjustInventory` | Ajustar inventario | ❌ Solo UI, sin lógica |
| `handleCreateMedication` | Crear medicamento | ❌ Solo alert, sin lógica |
| `handleUpdateMedication` | Actualizar medicamento | ❌ No implementada |
| `handleResolveAlert` | Resolver alerta | ❌ No implementada |
| `handleMarkAsExpired` | Marcar como vencido | ❌ No implementada |

### Botones con UI pero sin Lógica

En la vista de Inventario, hay 3 botones que no tienen lógica implementada:
- 📝 "Ajustar Stock" - Solo icono, sin onClick
- 📊 "Ver Historial" - Solo icono, sin onClick
- ➕ "Reabastecer" - Solo icono, sin onClick
4. Actualiza lastRestocked
5. Actualiza expirationDate si es más próxima
6. Resuelve alertas de STOCK_BAJO o AGOTADO si aplica

```typescript
interface StockEntryDetails {
  batchNumber?: string;      // Número de lote
  expirationDate: Date;      // Fecha de caducidad
  costPrice?: number;        // Costo unitario
  supplier?: string;         // Proveedor
  invoiceNumber?: string;    // Número de factura
  notes?: string;
}
```

---

### 8. Ajustar Inventario

```typescript
handleAdjustInventory(medicationId: string, newQuantity: number, reason: string): void
```

**Flujo:**
1. Calcula diferencia con stock actual
2. Crea StockMovement tipo `AJUSTE`
3. Actualiza currentStock en Medication
4. Registra razón del ajuste (obligatoria para auditoría)

---

### 9. Registrar Medicamento Nuevo

```typescript
handleCreateMedication(medicationData: MedicationInput): void
```

**Flujo:**
1. Valida datos requeridos
2. Crea registro de Medication
3. Si stock inicial < minStock, crea StockAlert

---

### 10. Actualizar Medicamento

```typescript
handleUpdateMedication(medicationId: string, updates: Partial<Medication>): void
```

**Campos actualizables:**
- Precios (costPrice, salePrice)
- Stock mínimo/máximo
- Ubicación
- Proveedor
- Datos de presentación

---

### 11. Ver Alertas de Stock

```typescript
handleGetStockAlerts(): StockAlert[]
```

**Flujo:**
1. Consulta StockAlerts con status `ACTIVA`
2. Ordena por prioridad (ALTA primero)
3. Incluye datos del medicamento

---

### 12. Resolver Alerta

```typescript
handleResolveAlert(alertId: string, action: AlertResolution): void
```

**Flujo:**
1. Actualiza status de StockAlert
2. Registra quién resolvió y cuándo
3. Si fue IGNORADA, requiere justificación

```typescript
interface AlertResolution {
  status: 'RESUELTA' | 'IGNORADA';
  notes: string;
}
```

---

### 13. Generar Reporte de Inventario

```typescript
handleGenerateInventoryReport(filters: ReportFilters): InventoryReport
```

**Filtros disponibles:**
- Por categoría
- Por proveedor
- Stock bajo mínimo
- Por vencer en X días

---

### 14. Ver Historial de Despachos

```typescript
handleGetDispenseHistory(filters: DispenseFilters): Dispense[]
```

**Filtros disponibles:**
- Por rango de fechas
- Por paciente
- Por medicamento
- Por farmacéutico

---

### 15. Marcar Medicamento como Vencido

```typescript
handleMarkAsExpired(medicationId: string, quantity: number): void
```

**Flujo:**
1. Crea StockMovement tipo `VENCIDO`
2. Resta cantidad del currentStock
3. Crea StockAlert tipo `VENCIDO` si no existe
4. Registra para auditoría/destrucción

---

## Formularios y Modales

### Modal: Detalles de Orden (`showOrderDetailsModal`)

**Información mostrada:**

| Sección | Campo | Descripción |
|---------|-------|-------------|
| Paciente | `nombre` | Nombre de la mascota |
| | `raza` | Raza del paciente |
| | `propietario` | Nombre del dueño |
| | `telefono` | Teléfono clickeable |
| | `numeroFicha` | Número de ficha |
| Receta | `descripcion` | Medicamentos prescritos |
| | `prioridad` | ALTA, MEDIA, BAJA (badge) |
| | `timestamp` | Fecha y hora de la receta |

**Acciones:**
- "Cerrar" → Cierra modal
- "Preparar Medicamentos" → Llama a `handlePrepare()` y cierra modal

---

### Modal: Agregar Medicamento (`showNewMedicationModal`)

| Campo | Tipo | Requerido | Opciones |
|-------|------|-----------|----------|
| Nombre del Medicamento | text | ✅ | Placeholder: "Ej: Amoxicilina 500mg" |
| Categoría | select | ✅ | Ver opciones abajo |
| Stock Inicial | number | ✅ | Placeholder: "0" |
| Stock Mínimo | number | ✅ | Placeholder: "0" |
| Precio Unitario | number | ✅ | step="0.01", Placeholder: "0.00" |

**Categorías disponibles:**
```typescript
const categorias = [
  'antibioticos',        // Antibióticos
  'antiinflamatorios',   // Antiinflamatorios
  'analgesicos',         // Analgésicos
  'vacunas',             // Vacunas
  'corticosteroides',    // Corticosteroides
  'protectores',         // Protectores Gástricos
  'otros'                // Otros
];
```

**Acciones:**
- "Cancelar" → Cierra modal
- "Agregar al Inventario" → Solo muestra alert (⚠️ NO guarda datos)

> ⚠️ **NOTA:** Este modal NO tiene lógica de guardado implementada. Solo muestra `alert('Medicamento agregado al inventario')` sin persistir datos.

---

## Secciones de la UI

| Sección | Key | Descripción | Badge |
|---------|-----|-------------|-------|
| Dashboard | `dashboard` | Estadísticas + órdenes urgentes + alertas stock | - |
| Recetas Pendientes | `recetas` | Lista de todas las tareas de farmacia | Cantidad |
| Inventario | `inventario` | Catálogo con búsqueda y filtros | Stock bajo (urgent) |
| Dispensados | `dispensados` | Historial de entregas (datos mock) | - |
| Reportes | `reportes` | Estadísticas y reportes (datos mock) | - |

### Vista Dashboard - Estadísticas

```typescript
const dashboardStats = [
  { icon: '💊', value: myTasks.length, label: 'Pedidos Pendientes', color: '#9c27b0' },
  { icon: '📦', value: inventory.length, label: 'Productos en Inventario', color: '#2196f3' },
  { icon: '⚠️', value: getLowStockCount(), label: 'Stock Bajo', color: '#f44336' },
  { icon: '✅', value: completedToday, label: 'Entregados Hoy', color: '#4caf50' }  // Mock: 18
];
```

### Vista Dashboard - Órdenes Urgentes

Filtra y muestra solo tareas con `prioridad === 'ALTA'`.

**Tarjeta de orden urgente:**
- Badge "URGENTE" rojo
- Hora de la receta
- Avatar del paciente (🐕/🐈)
- Nombre, propietario, ficha
- Medicamentos prescritos
- Botones: "Ver Detalles", "Preparar"

### Vista Dashboard - Alertas de Stock

Muestra productos donde `stock <= minimo`.

**Tarjeta de alerta:**
- Icono ⚠️
- Nombre del medicamento
- Stock actual vs mínimo ("Stock actual: **X** unidades (Mínimo: Y)")
- Categoría (badge)
- Botón "Reabastecer" (⚠️ `className="btn-small"` sin onClick - NO FUNCIONA)

**Estado vacío:** Si no hay productos con stock bajo, muestra:
> "✅ Todos los productos tienen stock suficiente"

### Vista Dispensados - Datos Mock

> ⚠️ Esta vista usa datos **hardcodeados**, no conectados al sistema.

**Columnas de la tabla:**

| Columna | Descripción | Ejemplo |
|---------|-------------|----------|
| Hora | Hora de entrega | 14:30 |
| Paciente | Avatar + nombre | 🐕 Max |
| Medicamentos | Lista de meds entregados | Amoxicilina 500mg, Carprofeno 75mg |
| Cantidad | Número de productos | 2 productos |
| Propietario | Nombre del dueño | Juan Pérez |
| Total | Monto cobrado | $60.00 |
| Estado | Badge de estado | ✅ Entregado |

**Datos hardcodeados en la tabla (5 registros):**

```typescript
const historialHardcoded = [
  { hora: '14:30', paciente: 'Max', especie: 'Perro', meds: 'Amoxicilina 500mg, Carprofeno 75mg', cantidad: 2, propietario: 'Juan Pérez', total: 60.00 },
  { hora: '13:15', paciente: 'Luna', especie: 'Gato', meds: 'Vacuna Triple Felina', cantidad: 1, propietario: 'María Sánchez', total: 45.00 },
  { hora: '11:45', paciente: 'Bobby', especie: 'Perro', meds: 'Metronidazol 250mg, Omeprazol 20mg', cantidad: 2, propietario: 'Carlos Ruiz', total: 38.00 },
  { hora: '10:20', paciente: 'Michi', especie: 'Gato', meds: 'Enrofloxacina 150mg', cantidad: 1, propietario: 'Laura Gómez', total: 30.00 },
  { hora: '09:00', paciente: 'Rocky', especie: 'Perro', meds: 'Tramadol 50mg, Meloxicam 15mg', cantidad: 2, propietario: 'Pedro Martínez', total: 72.00 }
];
```

**Summary Cards (datos mock):**

| Card | Valor | Fuente |
|------|-------|--------|
| Total Entregas Hoy | 18 | `completedToday` (hardcoded) |
| Ingresos del Día | $1,245.00 | Hardcoded en JSX |
| Productos Dispensados | 42 | Hardcoded en JSX |

### Vista Reportes - Datos Mock

4 tarjetas de reportes con datos **hardcodeados**:

#### 1. Medicamentos Más Dispensados (Top 5)

```typescript
const topMedicamentos = [
  { rank: 1, nombre: 'Amoxicilina 500mg', cantidad: 45 },
  { rank: 2, nombre: 'Carprofeno 75mg', cantidad: 32 },
  { rank: 3, nombre: 'Vacuna Séxtuple', cantidad: 28 },
  { rank: 4, nombre: 'Prednisona 5mg', cantidad: 25 },
  { rank: 5, nombre: 'Metronidazol 250mg', cantidad: 22 }
];
```

#### 2. Ingresos por Categoría

```typescript
const ingresosPorCategoria = [
  { categoria: 'Antibióticos', monto: 1250.00 },
  { categoria: 'Antiinflamatorios', monto: 890.00 },
  { categoria: 'Vacunas', monto: 780.00 },
  { categoria: 'Analgésicos', monto: 640.00 },
  { categoria: 'Otros', monto: 420.00 }
];
// Total implícito: $3,980.00
```

#### 3. Resumen Mensual

```typescript
const resumenMensual = {
  totalEntregas: 385,
  ingresosTotales: 24680.00,
  promedioDiario: 822.67,    // 24680 / 30 días
  reabastecimientos: 12
};
```

#### 4. Alertas y Notificaciones

| Tipo | Icono | Texto | Dato Dinámico |
|------|-------|-------|---------------|
| Warning | ⚠️ | Stock Bajo | `getLowStockCount()` productos |
| Info | ℹ️ | Pedidos Pendientes | `myTasks.length` órdenes |
| Success | ✅ | Meta Alcanzada | Hardcoded (siempre aparece) |

> ⚠️ **NOTA:** La alerta "Meta Alcanzada" siempre aparece, no hay lógica para validar si realmente se cumplió.

---

## Funciones del Contexto

```typescript
// Desde AppContext (useApp hook)
const {
  currentUser,           // Usuario logueado actual
  systemState,           // Estado global del sistema
  completeTask,          // Marcar tarea como completada
  deliverMedication,     // Entregar medicamentos y cambiar estado
  addToHistory           // Agregar entrada al historial (IMPORTADO PERO NO USADO)
} = useApp();
```

**Detalle de cada función:**

| Función | Parámetros | Descripción |
|---------|------------|-------------|
| `completeTask` | `(rol, taskId)` | Elimina tarea de `tareasPendientes.FARMACIA` |
| `deliverMedication` | `(patientId)` | Cambia estado a `LISTO_PARA_ALTA`, notifica Recepción |
| `addToHistory` | `(patientId, entry)` | ⚠️ Importado pero NO utilizado en el componente |

---

## Variables de Estado del Componente

```typescript
// Orden/tarea seleccionada
const [selectedOrder, setSelectedOrder] = useState(null);

// Estado de preparación por tarea { [taskId]: boolean }
const [preparingMeds, setPreparingMeds] = useState({});

// Navegación
const [activeSection, setActiveSection] = useState('dashboard');

// Búsqueda de inventario
const [searchQuery, setSearchQuery] = useState('');

// Modales
const [showNewMedicationModal, setShowNewMedicationModal] = useState(false);
const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
```

---

## Datos Computados (Derivados del Estado)

```typescript
// Tareas pendientes de farmacia
const myTasks = systemState.tareasPendientes.FARMACIA || [];

// Pacientes en farmacia (⚠️ DECLARADO PERO NO USADO EN UI)
const pharmacyPatients = systemState.pacientes.filter(p => p.estado === 'EN_FARMACIA');

// Órdenes pendientes (prioridad ALTA o MEDIA)
const pendingOrders = myTasks.filter(t => t.prioridad === 'ALTA' || t.prioridad === 'MEDIA');

// Órdenes urgentes (solo ALTA)
const urgentOrders = myTasks.filter(t => t.prioridad === 'ALTA');

// Entregados hoy (MOCK - hardcoded)
const completedToday = 18;

// Inventario filtrado por búsqueda
const filteredInventory = inventory.filter(item =>
  item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
  item.categoria.toLowerCase().includes(searchQuery.toLowerCase())
);
```

> ⚠️ **NOTA:** `pharmacyPatients` está declarado pero **NO se utiliza** en ninguna parte de la UI.

> ⚠️ **NOTA:** `pendingOrders` está declarado pero **NO se utiliza** en ninguna parte de la UI (se usa `urgentOrders` y `myTasks` en su lugar).

### Estructura de Task (Tarea de Farmacia)

```typescript
interface FarmaciaTask {
  id: string;              // ID único de la tarea
  pacienteId: string;      // FK → Paciente
  titulo: string;          // Título de la tarea
  descripcion: string;     // Medicamentos prescritos (lista)
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  timestamp: string;       // ISO date de creación
}
```

---

## Interacciones con Otros Módulos

### Datos que RECIBE de otros módulos

| Origen | Dato | Propósito |
|--------|------|-----------|
| **Médico** | Prescription | Cola de recetas a despachar |
| **Médico** | Datos del paciente | Identificar a quién entregar |
| **Médico** | Instrucciones de medicamento | Verificar y entregar |

### Datos que ENVÍA a otros módulos

| Destino | Dato | Propósito |
|---------|------|-----------|
| **Recepción** | Notificación "medicamentos entregados" | Paciente listo para salir |
| **Médico** | Confirmación de despacho | Saber que se entregó |
| **Médico** | Alerta si no hay stock | Buscar alternativa |

---

## Permisos de Base de Datos

| Tabla | Create | Read | Update | Delete |
|-------|--------|------|--------|--------|
| `Medication` | ✅ | ✅ | ✅ | ❌* |
| `Dispense` | ✅ | ✅ | ❌ | ❌ |
| `StockMovement` | ✅ | ✅ | ❌ | ❌ |
| `StockAlert` | ✅ | ✅ | ✅ | ❌ |
| `PurchaseOrder` | ✅ | ✅ | ✅ | ❌ |
| `Prescription` | ❌ | ✅ | ✅** | ❌ |
| `Pet` | ❌ | ✅ | ❌ | ❌ |
| `Owner` | ❌ | ✅ | ❌ | ❌ |
| `Visit` | ❌ | ✅ | ✅*** | ❌ |
| `Notification` | ✅ | ✅ | ❌ | ❌ |

*Medication: No se elimina, se marca como inactivo  
**Prescription: Solo puede actualizar `status`  
***Visit: Solo puede actualizar `status` a `LISTO_PARA_ALTA`

**Resumen:** Farmacia es **dueño** de `Medication`, `Dispense`, `StockMovement`, `StockAlert`, y `PurchaseOrder`.

---

## Vistas/Secciones del Dashboard

1. **Dashboard** - Resumen (pedidos pendientes, stock bajo, dispensados hoy)
2. **Recetas Pendientes** - Cola de prescripciones por despachar
3. **Inventario** - Catálogo completo de medicamentos
4. **Alertas** - Stock bajo, agotados, por vencer
5. **Historial** - Despachos realizados
6. **Reportes** - Reportes de inventario y movimientos

---

## Notas de Implementación

### Generación Automática de Alertas

```typescript
// Ejecutar diariamente o en cada movimiento
const generateAlerts = async () => {
  const medications = await prisma.medication.findMany();
  
  for (const med of medications) {
    // Stock bajo
    if (med.currentStock <= med.minStock && med.currentStock > 0) {
      await createAlertIfNotExists(med.id, 'STOCK_BAJO', 'MEDIA');
    }
    
    // Agotado
    if (med.currentStock === 0) {
      await createAlertIfNotExists(med.id, 'AGOTADO', 'ALTA');
    }
    
    // Por vencer (30 días)
    const thirtyDaysFromNow = addDays(new Date(), 30);
    if (med.expirationDate <= thirtyDaysFromNow) {
      await createAlertIfNotExists(med.id, 'POR_VENCER', 'MEDIA');
    }
    
    // Vencido
    if (med.expirationDate < new Date()) {
      await createAlertIfNotExists(med.id, 'VENCIDO', 'ALTA');
    }
  }
};
```

### Colores de Alerta
```typescript
const alertColors = {
  STOCK_BAJO: '#ff9800',   // Naranja
  AGOTADO: '#f44336',      // Rojo
  POR_VENCER: '#ff9800',   // Naranja
  VENCIDO: '#f44336'       // Rojo
};
```

---

## Inventario Mock

### Estructura de Item de Inventario

```typescript
interface InventoryItem {
  id: number;           // ID único
  nombre: string;       // Nombre del medicamento
  stock: number;        // Stock actual
  minimo: number;       // Stock mínimo (para alertas)
  categoria: string;    // Categoría del medicamento
  precio: number;       // Precio unitario
}
```

### Datos Hardcodeados (10 productos)

```typescript
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
```

### Productos con Stock Bajo (Inicial)

| Producto | Stock | Mínimo | Estado |
|----------|-------|--------|--------|
| Metronidazol 250mg | 45 | 40 | ⚠️ Cerca del mínimo |
| Tramadol 50mg | 25 | 30 | 🔴 Por debajo |
| Meloxicam 15mg | 15 | 25 | 🔴 Por debajo |

### Categorías en el Mock

- Antibióticos (4 productos)
- Antiinflamatorios (2 productos)
- Corticosteroides (1 producto)
- Analgésicos (1 producto)
- Protectores Gástricos (1 producto)
- Vacunas (1 producto)

---

## Notas de Implementación Pendientes

### TODOs Identificados en el Código

1. **Vista Dispensados:** Datos completamente hardcodeados. Necesita:
   - Conectar con historial real de despachos
   - Implementar cálculo dinámico de ingresos
   - Contador real de productos dispensados

2. **Vista Reportes:** Todos los datos son mock. Necesita:
   - Conectar con datos reales del sistema
   - Implementar agregaciones por categoría
   - Calcular métricas mensuales

3. **Modal Agregar Medicamento:** Solo tiene UI. Necesita:
   - Función para agregar al inventario
   - Validaciones de formulario
   - Persistencia de datos

4. **Botones de Inventario:** 3 botones sin lógica:
   - Ajustar Stock (📝)
   - Ver Historial (📊)
   - Reabastecer (➕)

5. **`pharmacyPatients`:** Variable declarada pero no utilizada.

6. **`addToHistory`:** Importado del contexto pero no utilizado.

### Cálculo de Barra de Stock

```typescript
// Porcentaje de la barra de stock visual
const stockPercentage = (item.stock / (item.minimo * 3)) * 100;
// Color: Rojo si stock <= minimo, Verde si > minimo
const barColor = isLowStock ? '#f44336' : '#4caf50';
```

---

## Resumen de Estadísticas

| Métrica | Valor |
|---------|-------|
| Líneas de código | 767 |
| Entidades documentadas | 5 |
| Funciones implementadas | 3 |
| Funciones planificadas (no impl) | 9 |
| Modales | 2 |
| Secciones UI | 5 |
| Funciones del contexto | 3 (1 sin usar) |
| Variables de estado | 6 |
| Datos computados | 6 (2 sin usar) |
| Productos en mock | 10 |
| Productos con stock bajo | 3 |
| Registros en historial mock | 5 |
| Categorías en inventario | 6 |
| Botones sin lógica | 4 |

---

## Archivos Relacionados

| Archivo | Propósito |
|---------|----------|
| `src/components/dashboards/FarmaciaDashboard.jsx` | Componente principal (767 líneas) |
| `src/components/dashboards/FarmaciaDashboard.css` | Estilos del dashboard |
| `src/context/AppContext.jsx` | Estado global y funciones |

---

**Documento generado para el Proyecto EVEREST - VET-OS**  
**Revisión Senior Dev - Versión 2.1 FINAL**  
**Última actualización:** Enero 21, 2026

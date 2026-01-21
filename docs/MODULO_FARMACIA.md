# 💊 Módulo Farmacia - VET-OS (EVEREST)

## Documentación Técnica Completa

**Fecha:** Enero 21, 2026  
**Versión:** 1.0  
**Archivo fuente:** `src/components/dashboards/FarmaciaDashboard.jsx` (767 líneas)

---

## 📋 Índice

1. [Propósito del Módulo](#propósito-del-módulo)
2. [Entidades que Maneja](#entidades-que-maneja)
3. [Estados del Sistema](#estados-del-sistema)
4. [Funciones Principales](#funciones-principales)
5. [Formularios](#formularios)
6. [Interacciones con Otros Módulos](#interacciones-con-otros-módulos)
7. [Permisos de Base de Datos](#permisos-de-base-de-datos)

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

## Funciones Principales

### 1. Ver Recetas Pendientes

```typescript
handleGetPendingPrescriptions(): Prescription[]
```

**Flujo:**
1. Consulta Prescriptions con status `PENDIENTE`
2. Ordena por fecha de creación (más antiguas primero)
3. Incluye datos del paciente y prescriptor

---

### 2. Despachar Receta Completa

```typescript
handleDispensePrescription(prescriptionId: string, dispenseData: DispenseInput): void
```

**Flujo:**
1. Valida que hay stock suficiente para todos los items
2. Crea registro de Dispense con status `COMPLETO`
3. Por cada item:
   - Crea StockMovement tipo `SALIDA`
   - Actualiza currentStock en Medication
4. Cambia status de Prescription a `DESPACHADA`
5. Cambia status de Visit a `LISTO_PARA_ALTA`
6. Notifica a Recepción

---

### 3. Despachar Parcialmente

```typescript
handlePartialDispense(prescriptionId: string, items: PartialDispenseItem[], reason: string): void
```

**Flujo:**
1. Crea registro de Dispense con status `PARCIAL`
2. Solo procesa items con stock disponible
3. Registra razón para items no despachados
4. Cambia status de Prescription a `PARCIAL`
5. Notifica al médico sobre faltantes

---

### 4. Rechazar/Devolver Receta

```typescript
handleRejectPrescription(prescriptionId: string, reason: string): void
```

**Flujo:**
1. Cambia status de Prescription a `CANCELADA` (nota: médico debe re-evaluar)
2. Notifica al médico con la razón
3. No crea registro de Dispense

---

### 5. Buscar Medicamento

```typescript
handleSearchMedication(query: string): Medication[]
```

**Busca por:**
- Nombre comercial
- Nombre genérico
- Categoría

---

### 6. Ver Stock de Medicamento

```typescript
handleCheckStock(medicationId: string): StockInfo
```

**Retorna:**
- Stock actual
- Stock mínimo/máximo
- Última reposición
- Fecha de vencimiento
- Ubicación

---

### 7. Agregar Stock (Entrada)

```typescript
handleAddStock(medicationId: string, quantity: number, details: StockEntryDetails): void
```

**Flujo:**
1. Valida datos de entrada
2. Crea StockMovement tipo `ENTRADA`
3. Actualiza currentStock en Medication
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

## Formularios

### Formulario: Despacho de Receta

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `prescriptionId` | hidden | ✅ | ID de la receta |
| `items[].dispensedQty` | number | ✅ | Cantidad a despachar |
| `items[].reason` | text | ❌ | Solo si es parcial |
| `deliveredTo` | text | ✅ | Nombre de quien recibe |
| `notes` | textarea | ❌ | Notas adicionales |
| `signature` | signature | ❌ | Firma digital |

---

### Formulario: Nuevo Medicamento

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `name` | text | ✅ | Mínimo 2 caracteres |
| `genericName` | text | ❌ | - |
| `category` | select | ✅ | Ver MedicationCategory |
| `presentation` | text | ✅ | - |
| `concentration` | text | ❌ | - |
| `unit` | text | ✅ | - |
| `currentStock` | number | ✅ | ≥ 0 |
| `minStock` | number | ✅ | ≥ 0 |
| `maxStock` | number | ❌ | > minStock |
| `location` | text | ❌ | - |
| `requiresRefrigeration` | checkbox | ❌ | Default: false |
| `isControlled` | checkbox | ❌ | Default: false |
| `costPrice` | number | ❌ | ≥ 0 |
| `salePrice` | number | ✅ | > 0 |
| `expirationDate` | date | ✅ | Fecha futura |
| `supplier` | text | ❌ | - |

---

### Formulario: Entrada de Stock

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `medicationId` | select | ✅ | Medicamento existente |
| `quantity` | number | ✅ | > 0 |
| `batchNumber` | text | ❌ | - |
| `expirationDate` | date | ✅ | Fecha futura |
| `costPrice` | number | ❌ | ≥ 0 |
| `supplier` | text | ❌ | - |
| `invoiceNumber` | text | ❌ | - |
| `notes` | textarea | ❌ | - |

---

### Formulario: Ajuste de Inventario

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `medicationId` | select | ✅ | Medicamento existente |
| `adjustmentType` | select | ✅ | Ver MovementType |
| `quantity` | number | ✅ | Según tipo |
| `reason` | textarea | ✅ | Mínimo 10 caracteres |

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

### Inventario Mock Inicial
```typescript
const initialInventory = [
  { name: 'Amoxicilina 500mg', stock: 150, minStock: 50, category: 'ANTIBIOTICO', price: 25.00 },
  { name: 'Carprofeno 75mg', stock: 80, minStock: 30, category: 'ANTIINFLAMATORIO', price: 35.00 },
  { name: 'Metronidazol 250mg', stock: 45, minStock: 40, category: 'ANTIBIOTICO', price: 20.00 },
  { name: 'Prednisona 5mg', stock: 120, minStock: 50, category: 'ANTIINFLAMATORIO', price: 15.00 },
  { name: 'Tramadol 50mg', stock: 25, minStock: 30, category: 'ANALGESICO', price: 40.00 },
  { name: 'Doxiciclina 100mg', stock: 90, minStock: 40, category: 'ANTIBIOTICO', price: 28.00 },
  { name: 'Meloxicam 15mg', stock: 15, minStock: 25, category: 'ANTIINFLAMATORIO', price: 32.00 },
  { name: 'Omeprazol 20mg', stock: 110, minStock: 50, category: 'OTRO', price: 18.00 },
  { name: 'Enrofloxacina 150mg', stock: 65, minStock: 30, category: 'ANTIBIOTICO', price: 30.00 },
  { name: 'Vacuna Séxtuple', stock: 30, minStock: 20, category: 'VACUNA', price: 45.00 },
];
```

---

**Documento generado para el Proyecto EVEREST - VET-OS**

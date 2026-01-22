# VET-OS Backend

Backend API para el sistema de gestión veterinaria VET-OS (EVEREST Project).

## 🚀 Tecnologías

- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x
- **ORM:** Prisma 5.x
- **Database:** MySQL (Hostinger)
- **Auth:** JWT + bcrypt
- **Validation:** Zod

## 📦 Instalación

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
cp ../.env.example .env
```

Edita `.env` con tus credenciales:

```env
DATABASE_URL="mysql://usuario:password@host:3306/database"
JWT_SECRET="tu-secreto-super-seguro-de-32-caracteres"
PORT=3001
NODE_ENV=development
```

### 3. Generar cliente Prisma

```bash
npx prisma generate
```

### 4. Sincronizar base de datos

**Opción A:** Push directo (desarrollo)
```bash
npx prisma db push
```

**Opción B:** Migraciones (producción)
```bash
npx prisma migrate dev --name init
```

### 5. Cargar datos semilla

```bash
npx prisma db seed
```

### 6. Iniciar servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm run build
npm start
```

## 🔌 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Registro (admin) |
| GET | `/api/v1/auth/me` | Usuario actual |
| PUT | `/api/v1/auth/change-password` | Cambiar contraseña |

### Propietarios
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/owners` | Listar propietarios |
| GET | `/api/v1/owners/:id` | Detalle propietario |
| POST | `/api/v1/owners` | Crear propietario |
| PUT | `/api/v1/owners/:id` | Actualizar propietario |
| GET | `/api/v1/owners/search/phone?telefono=xxx` | Buscar por teléfono |

### Mascotas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/pets` | Listar mascotas |
| GET | `/api/v1/pets/:id` | Detalle mascota |
| POST | `/api/v1/pets` | Crear mascota |
| PUT | `/api/v1/pets/:id` | Actualizar mascota |
| GET | `/api/v1/pets/by-status/:status` | Por estado |

### Visitas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/visits/today` | Visitas de hoy |
| POST | `/api/v1/visits` | Check-in |
| PUT | `/api/v1/visits/:id/triage` | Completar triage |
| PUT | `/api/v1/visits/:id/discharge` | Alta |

### Citas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/appointments` | Listar citas |
| POST | `/api/v1/appointments` | Crear cita |
| PUT | `/api/v1/appointments/:id/confirm` | Confirmar |
| PUT | `/api/v1/appointments/:id/cancel` | Cancelar |

### Consultas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/consultations` | Listar consultas |
| POST | `/api/v1/consultations` | Iniciar consulta |
| PUT | `/api/v1/consultations/:id` | Actualizar (SOAP) |
| PUT | `/api/v1/consultations/:id/complete` | Completar |

### Laboratorio
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/lab-requests` | Listar solicitudes |
| GET | `/api/v1/lab-requests/pending` | Pendientes |
| POST | `/api/v1/lab-requests` | Crear solicitud |
| PUT | `/api/v1/lab-requests/:id/start` | Iniciar proceso |
| PUT | `/api/v1/lab-requests/:id/results` | Agregar resultados |

### Recetas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/prescriptions` | Listar recetas |
| GET | `/api/v1/prescriptions/pending` | Pendientes farmacia |
| POST | `/api/v1/prescriptions` | Crear receta |

### Cirugías
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/surgeries` | Listar cirugías |
| GET | `/api/v1/surgeries/today` | Cirugías de hoy |
| POST | `/api/v1/surgeries` | Programar cirugía |
| PUT | `/api/v1/surgeries/:id/start` | Iniciar |
| PUT | `/api/v1/surgeries/:id/complete` | Completar |

### Hospitalización
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/hospitalizations` | Listar hospitalizados |
| POST | `/api/v1/hospitalizations` | Admitir paciente |
| POST | `/api/v1/hospitalizations/:id/monitorings` | Agregar monitoreo |
| PUT | `/api/v1/hospitalizations/:id/discharge` | Alta |

### Medicamentos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/medications` | Listar medicamentos |
| GET | `/api/v1/medications/low-stock` | Stock bajo |
| GET | `/api/v1/medications/expiring` | Por vencer |
| POST | `/api/v1/medications` | Crear medicamento |
| PUT | `/api/v1/medications/:id/adjust-stock` | Ajustar stock |

### Despachos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dispenses` | Listar despachos |
| POST | `/api/v1/dispenses` | Crear despacho |

### Dashboard
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/recepcion` | Stats recepción |
| GET | `/api/v1/dashboard/medico` | Stats médico |
| GET | `/api/v1/dashboard/farmacia` | Stats farmacia |
| GET | `/api/v1/dashboard/laboratorio` | Stats laboratorio |
| GET | `/api/v1/dashboard/admin` | Stats admin |

## 🔐 Usuarios Semilla

| Email | Password | Rol |
|-------|----------|-----|
| admin@vetos.com | password123 | ADMIN |
| recepcion@vetos.com | password123 | RECEPCION |
| dr.garcia@vetos.com | password123 | MEDICO |
| dra.martinez@vetos.com | password123 | MEDICO |
| lab@vetos.com | password123 | LABORATORIO |
| farmacia@vetos.com | password123 | FARMACIA |

## 📁 Estructura

```
backend/
├── src/
│   ├── index.ts           # Entry point
│   ├── lib/
│   │   └── prisma.ts      # Prisma client singleton
│   ├── middleware/
│   │   ├── auth.ts        # JWT authentication
│   │   ├── errorHandler.ts
│   │   └── notFound.ts
│   └── routes/
│       ├── auth.routes.ts
│       ├── owner.routes.ts
│       ├── pet.routes.ts
│       ├── visit.routes.ts
│       ├── appointment.routes.ts
│       ├── consultation.routes.ts
│       ├── labRequest.routes.ts
│       ├── prescription.routes.ts
│       ├── surgery.routes.ts
│       ├── hospitalization.routes.ts
│       ├── medication.routes.ts
│       ├── dispense.routes.ts
│       ├── task.routes.ts
│       ├── notification.routes.ts
│       └── dashboard.routes.ts
├── package.json
└── tsconfig.json
```

## 🛠️ Scripts

```bash
npm run dev      # Desarrollo con hot-reload
npm run build    # Compilar TypeScript
npm start        # Producción
npm run lint     # Linter
```

## 📝 Notas

- El frontend corre en `http://localhost:5173`
- El backend corre en `http://localhost:3001`
- CORS está configurado para ambos puertos
- Todos los endpoints requieren autenticación excepto `/auth/login`

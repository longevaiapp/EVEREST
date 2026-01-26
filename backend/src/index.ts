// src/index.ts
// VET-OS Backend Entry Point

import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Import routes
import authRoutes from './routes/auth.routes';
import ownerRoutes from './routes/owner.routes';
import petRoutes from './routes/pet.routes';
import visitRoutes from './routes/visit.routes';
import appointmentRoutes from './routes/appointment.routes';
import consultationRoutes from './routes/consultation.routes';
import labRequestRoutes from './routes/labRequest.routes';
import prescriptionRoutes from './routes/prescription.routes';
import surgeryRoutes from './routes/surgery.routes';
import hospitalizationRoutes from './routes/hospitalization.routes';
import medicationRoutes from './routes/medication.routes';
import dispenseRoutes from './routes/dispense.routes';
import taskRoutes from './routes/task.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import medicoRoutes from './routes/medico.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// ===========================================================================
// MIDDLEWARE
// ===========================================================================

// Security headers
app.use(helmet());

// CORS - Allow frontend (multiple ports for development)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ===========================================================================
// ROUTES
// ===========================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'VET-OS API'
  });
});

// API Routes
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/owners`, ownerRoutes);
app.use(`${API_PREFIX}/pets`, petRoutes);
app.use(`${API_PREFIX}/visits`, visitRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
app.use(`${API_PREFIX}/consultations`, consultationRoutes);
app.use(`${API_PREFIX}/lab-requests`, labRequestRoutes);
app.use(`${API_PREFIX}/prescriptions`, prescriptionRoutes);
app.use(`${API_PREFIX}/surgeries`, surgeryRoutes);
app.use(`${API_PREFIX}/hospitalizations`, hospitalizationRoutes);
app.use(`${API_PREFIX}/medications`, medicationRoutes);
app.use(`${API_PREFIX}/dispenses`, dispenseRoutes);
app.use(`${API_PREFIX}/tasks`, taskRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/medico`, medicoRoutes);

// ===========================================================================
// ERROR HANDLING
// ===========================================================================

app.use(notFound);
app.use(errorHandler);

// ===========================================================================
// START SERVER
// ===========================================================================

import { prisma } from './lib/prisma';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    const server = app.listen(PORT, () => {
      console.log(`
  🏥 VET-OS API Server
  =====================
  📍 Running on: http://localhost:${PORT}
  📋 Health:     http://localhost:${PORT}/health
  🔗 API:        http://localhost:${PORT}${API_PREFIX}
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  =====================
      `);
    });

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();

export default app;

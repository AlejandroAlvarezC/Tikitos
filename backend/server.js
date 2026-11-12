// 1. Cargar dotenv al inicio absoluto
import 'dotenv/config'; 

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import connectDB from './src/config/db.js';
import qrRoutes from './src/routes/qrRoutes.js';

console.log("DEBUG: MONGO_URI configurado correctamente");
console.log("DEBUG: ¿connectDB es una función?", typeof connectDB);

const app = express();

// 🌟 CORS CORREGIDO: Definir los orígenes permitidos de forma segura
const allowedOrigins = [
  'https://tikitos-neon.vercel.app', // Tu frontend en Vercel
  'http://localhost:5173',           // Vite local
  'http://localhost:3000'            // React local alternativo
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman o apps móviles)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Bloqueado por la política CORS'), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Conectar a la base de datos
connectDB();

// Rutas
app.use('/api/inventory', inventoryRoutes);
app.use('/api/qr-templates', qrRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
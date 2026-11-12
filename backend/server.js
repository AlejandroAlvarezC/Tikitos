import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import connectDB from './src/config/db.js';
import qrRoutes from './src/routes/qrRoutes.js';

// 🌟 1. PRIMERO inicializamos la aplicación Express (¡Aquí estaba el error!)
const app = express();

// 🌟 2. DESPUÉS configuramos los middlewares usando `app`
const allowedOrigins = [
  'https://tikitos-neon.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://192.168.1.20:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const isVercelPreview = cleanOrigin.endsWith('.vercel.app');
    const isAllowed = allowedOrigins.includes(cleanOrigin) || isVercelPreview;

    if (!isAllowed) {
      console.warn(`⚠️ Origen bloqueado por CORS: ${origin}`);
      return callback(new Error('Bloqueado por la política CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
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
// 1. Cargar dotenv al inicio absoluto
import 'dotenv/config'; 

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose'; // Importa mongoose aquí también
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import connectDB from './src/config/db.js';
import qrRoutes from './src/routes/qrRoutes.js';

console.log("DEBUG: MONGO_URI es:", process.env.MONGO_URI);
console.log("DEBUG: ¿connectDB es una función?", typeof connectDB);

const app = express();

// 🌟 CONFIGURACIÓN CORS (Pon esto justo aquí, antes de tus rutas)
app.use(cors({
  origin: '*', // Esto permite que CUALQUIER frontend se conecte. 
               // Para producción es mejor poner tu IP específica.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Conectar a la base de datos
connectDB();

// Rutas
app.use('/api/inventory', inventoryRoutes);
app.use('/api/qr-templates', qrRoutes);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));



const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://192.168.1.20:${PORT}`);
});
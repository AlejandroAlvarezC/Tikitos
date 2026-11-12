import express from 'express';
import cors from 'cors';

const app = express();

// 🌟 Lista de dominios permitidos para consumir tu API
const allowedOrigins = [
  'https://tikitos-neon.vercel.app', // Tu frontend oficial en Vercel
  'http://localhost:5173',           // Entorno local de Vite
  'http://localhost:3000'            // Entorno local alternativo
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (ej. Postman o apps móviles)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Bloqueado por la política CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());
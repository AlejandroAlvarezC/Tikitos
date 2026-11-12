// 🌟 Lista de dominios principales permitidos
const allowedOrigins = [
  'https://tikitos-neon.vercel.app', // Tu frontend oficial en Vercel
  'http://localhost:5173',           // Entorno local de Vite
  'http://localhost:3000'            // Entorno local alternativo
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (Postman, cURL, aplicaciones móviles)
    if (!origin) return callback(null, true);

    // Permitir dominios exactos o cualquier despliegue de preview en Vercel (*.vercel.app)
    const isVercelPreview = origin.endsWith('.vercel.app');
    const isAllowed = allowedOrigins.includes(origin) || isVercelPreview;

    if (!isAllowed) {
      console.warn(`⚠️ Origen bloqueado por CORS: ${origin}`);
      return callback(new Error('Bloqueado por la política CORS'), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
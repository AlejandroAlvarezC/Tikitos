const allowedOrigins = [
  'https://tikitos-neon.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://192.168.1.20:5173' // Por si pruebas en red local
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Remover barra al final si la trae (trailing slash)
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
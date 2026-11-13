import express from 'express';
import { 
  getTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate,
  migrarImagenesBase64 
} from '../controllers/qrController.js';

const router = express.Router();

// 📋 Obtener todas las plantillas
router.get('/', getTemplates);

// 🚀 Ruta temporal para migrar imágenes Base64 antiguas a Cloudinary
router.get('/migrar', migrarImagenesBase64);

// ➕ Crear una nueva plantilla
router.post('/', createTemplate);

// ✏️ Actualizar una plantilla existente por ID
router.put('/:id', updateTemplate);

// ❌ Eliminar una plantilla por ID
router.delete('/:id', deleteTemplate);

export default router;
import express from 'express';
import { 
  getTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate 
} from '../controllers/qrController.js';

const router = express.Router();

// 📋 Obtener todas las plantillas
router.get('/qr-templates', getTemplates);

// ➕ Crear una nueva plantilla
router.post('/qr-templates', createTemplate);

// ✏️ Actualizar una plantilla existente por ID (PUT)
router.put('/qr-templates/:id', updateTemplate);

// ❌ Eliminar una plantilla por ID
router.delete('/qr-templates/:id', deleteTemplate);

export default router;
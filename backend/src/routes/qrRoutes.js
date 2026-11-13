import express from 'express';
import { 
  getTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate 
} from '../controllers/qrController.js';

const router = express.Router();

// 📋 Obtener todas las plantillas (URL final: GET /api/qr-templates)
router.get('/', getTemplates);

// ➕ Crear una nueva plantilla (URL final: POST /api/qr-templates)
router.post('/', createTemplate);

// ✏️ Actualizar una plantilla existente por ID (URL final: PUT /api/qr-templates/:id)
router.put('/:id', updateTemplate);

// ❌ Eliminar una plantilla por ID (URL final: DELETE /api/qr-templates/:id)
router.delete('/:id', deleteTemplate);

export default router;
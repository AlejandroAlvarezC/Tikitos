import QrTemplate from '../models/QrTemplate.js';

// 📋 Obtener todas las plantillas
export const getTemplates = async (req, res) => {
  try {
    const templates = await QrTemplate.find({}).sort({ createdAt: -1 });
    return res.status(200).json(templates);
  } catch (err) {
    console.error("❌ Error al obtener plantillas:", err.message);
    return res.status(500).json({ error: "Error al obtener las plantillas" });
  }
};

// ➕ Crear una nueva plantilla
export const createTemplate = async (req, res) => {
  try {
    const nuevaPlantilla = new QrTemplate(req.body);
    const guardada = await nuevaPlantilla.save();
    return res.status(201).json(guardada);
  } catch (err) {
    console.error("❌ Error al guardar plantilla:", err.message);
    return res.status(400).json({ error: err.message });
  }
};

// ✏️ Actualizar una plantilla existente por ID (sin romper documentos antiguos)
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const actualizada = await QrTemplate.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true, runValidators: false }
    );
    
    if (!actualizada) {
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }
    return res.status(200).json(actualizada);
  } catch (err) {
    console.error("❌ Error al actualizar plantilla:", err.message);
    return res.status(400).json({ error: "Error al actualizar la plantilla: " + err.message });
  }
};

// ❌ Eliminar una plantilla por ID
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminada = await QrTemplate.findByIdAndDelete(id);
    
    if (!eliminada) {
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }
    return res.status(200).json({ message: "Plantilla eliminada con éxito" });
  } catch (err) {
    console.error("❌ Error al eliminar plantilla:", err.message);
    return res.status(500).json({ error: "Error al eliminar la plantilla" });
  }
};
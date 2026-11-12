import QrTemplate from '../models/QrTemplate.js';

// 📋 Obtener todas las plantillas
export const getTemplates = async (req, res) => {
  try {
    const templates = await QrTemplate.find({}).lean();
    return res.status(200).json(templates || []);
  } catch (err) {
    console.warn("⚠️ Aviso al obtener plantillas:", err.message);
    return res.status(200).json([]);
  }
};

// ➕ Crear nueva plantilla
export const createTemplate = async (req, res) => {
  try {
    const nuevaPlantilla = new QrTemplate(req.body);
    const guardada = await nuevaPlantilla.save();
    return res.status(201).json(guardada);
  } catch (err) {
    console.error("❌ Error al guardar plantilla:", err.message);
    return res.status(400).json({ error: "Error al guardar la plantilla" });
  }
};

// 🗑️ Eliminar plantilla
export const deleteTemplate = async (req, res) => {
  try {
    const eliminada = await QrTemplate.findByIdAndDelete(req.params.id);
    if (!eliminada) {
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }
    return res.json({ message: "Plantilla eliminada correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar plantilla:", err.message);
    return res.status(500).json({ error: "Error al eliminar la plantilla" });
  }
};
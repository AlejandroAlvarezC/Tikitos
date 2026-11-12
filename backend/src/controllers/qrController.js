import QrTemplate from '../models/QrTemplate.js';


// 📋 Obtener todas las plantillas con allowDiskUse para evitar límite de memoria
export const getTemplates = async (req, res) => {
  try {
    const templates = await QrTemplate.find()
      .sort({ createdAt: -1 })
      .allowDiskUse(true) // 🌟 Permite superar el límite de 32MB usando disco en MongoDB
      .lean();

    res.json(templates || []);
  } catch (err) {
    console.error("❌ Error crítico en getTemplates:", err.message);
    res.status(500).json({ error: "Error interno al obtener las plantillas: " + err.message });
  }
};

// ➕ Crear nueva plantilla
export const createTemplate = async (req, res) => {
  try {
    const nuevaPlantilla = new QrTemplate(req.body);
    const guardada = await nuevaPlantilla.save();
    res.status(201).json(guardada);
  } catch (err) {
    console.error("❌ Error al guardar plantilla:", err.message);
    res.status(400).json({ error: "Error al guardar la plantilla: " + err.message });
  }
};

// 🗑️ Eliminar plantilla
export const deleteTemplate = async (req, res) => {
  try {
    const eliminada = await QrTemplate.findByIdAndDelete(req.params.id);
    if (!eliminada) {
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }
    res.json({ message: "Plantilla eliminada correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar plantilla:", err.message);
    res.status(500).json({ error: "Error al eliminar la plantilla" });
  }
};
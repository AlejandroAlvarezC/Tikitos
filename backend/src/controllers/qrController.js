import QrTemplate from '../models/QrTemplate.js';


export const getTemplates = async (req, res) => {
  try {
    // Verificamos que la conexión a la BD esté lista
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Base de datos no conectada aún" });
    }

    // Consulta directa a la colección nativa 'qrtemplates'
    const db = mongoose.connection.db;
    const templates = await db.collection('qrtemplates').find({}).toArray();

    res.json(templates || []);
  } catch (err) {
    console.error("❌ Error crítico en getTemplates (nativo):", err.message);
    res.status(500).json({ error: "Error interno: " + err.message });
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
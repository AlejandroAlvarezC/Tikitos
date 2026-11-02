import QrTemplate from '../models/QrTemplate.js';

// Obtener todas las plantillas guardadas
export const getTemplates = async (req, res) => {
  try {
    const templates = await QrTemplate.find();
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error al obtener plantillas QR:", error);
    res.status(500).json({ message: "Error al consultar la base de datos" });
  }
};

// Crear una nueva plantilla
export const createTemplate = async (req, res) => {
  try {
    const { tipo, marca, estilo, color, qrCode, imagen, tallas } = req.body;
    
    if (!tipo || !marca || !estilo || !color || !qrCode) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const existing = await QrTemplate.findOne({ qrCode });
    if (existing) {
      return res.status(400).json({ message: "Este código QR ya está guardado." });
    }

    const newTemplate = new QrTemplate({
      tipo,
      marca,
      estilo,
      color,
      qrCode,
      imagen: imagen || "", // 🌟 Guarda la URL de la foto al crear la plantilla
      tallas
    });

    await newTemplate.save();
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error al guardar plantilla QR:", error);
    res.status(500).json({ message: "Error al guardar en la base de datos" });
  }
};

// Eliminar una plantilla por ID
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await QrTemplate.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    
    res.status(200).json({ message: "Plantilla eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar plantilla QR:", error);
    res.status(500).json({ message: "Error al eliminar en la base de datos" });
  }
};
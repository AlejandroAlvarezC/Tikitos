import QrTemplate from '../models/QrTemplate.js';
import Product from '../models/Product.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

// 📋 Obtener todas las plantillas (Ordenado por índice primario _id)
export const getTemplates = async (req, res) => {
  try {
    const templates = await QrTemplate.find({})
      .sort({ _id: -1 })
      .limit(50)
      .lean();
      
    return res.status(200).json(templates);
  } catch (err) {
    console.error("❌ Error al obtener plantillas:", err.message);
    return res.status(500).json({ error: "Error al obtener las plantillas: " + err.message });
  }
};

// ➕ Crear una nueva plantilla (Subiendo imagen a Cloudinary)
export const createTemplate = async (req, res) => {
  try {
    const datosPlantilla = { ...req.body };

    if (datosPlantilla.imagen) {
      datosPlantilla.imagen = await subirImagenACloudinary(datosPlantilla.imagen);
    }

    const nuevaPlantilla = new QrTemplate(datosPlantilla);
    const guardada = await nuevaPlantilla.save();
    return res.status(201).json(guardada);
  } catch (err) {
    console.error("❌ Error al guardar plantilla:", err.message);
    return res.status(400).json({ error: err.message });
  }
};

// ✏️ Actualizar una plantilla existente por ID (Subiendo imagen si cambió)
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizar = { ...req.body };

    if (datosActualizar.imagen) {
      datosActualizar.imagen = await subirImagenACloudinary(datosActualizar.imagen);
    }
    
    const actualizada = await QrTemplate.findByIdAndUpdate(
      id, 
      datosActualizar, 
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

// 🚀 Endpoint temporal para migrar Base64 antiguos a Cloudinary uno por uno
export const migrarImagenesBase64 = async (req, res) => {
  try {
    console.log("🛠️ Iniciando migración de imágenes Base64 a Cloudinary...");
    let plantillasMigradas = 0;
    let productosMigrados = 0;

    // 1. Migrar plantillas
    const templatesIds = await QrTemplate.find({}).select('_id').lean();
    for (const item of templatesIds) {
      const tpl = await QrTemplate.findById(item._id).lean();
      if (tpl?.imagen && tpl.imagen.startsWith('data:image')) {
        const nuevaUrl = await subirImagenACloudinary(tpl.imagen);
        await QrTemplate.findByIdAndUpdate(item._id, { imagen: nuevaUrl });
        plantillasMigradas++;
        console.log(`✅ Plantilla migrada (${plantillasMigradas}): ${item._id}`);
      }
    }

    // 2. Migrar productos del inventario
    const productsIds = await Product.find({}).select('_id').lean();
    for (const item of productsIds) {
      const prod = await Product.findById(item._id).lean();
      if (prod?.imagen && prod.imagen.startsWith('data:image')) {
        const nuevaUrl = await subirImagenACloudinary(prod.imagen);
        await Product.findByIdAndUpdate(item._id, { imagen: nuevaUrl });
        productosMigrados++;
        console.log(`✅ Producto migrado (${productosMigrados}): ${item._id}`);
      }
    }

    return res.status(200).json({
      mensaje: "Migración completada con éxito",
      plantillasMigradas,
      productosMigrados
    });
  } catch (err) {
    console.error("❌ Error durante la migración:", err.message);
    return res.status(500).json({ error: "Error en migración: " + err.message });
  }
};
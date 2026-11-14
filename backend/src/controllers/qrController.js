import QrTemplate from '../models/QrTemplate.js';
import Product from '../models/Product.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

// 📋 1. Obtener todas las plantillas (Ordenado por índice primario _id)
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

// ➕ 2. Crear una nueva plantilla (Subiendo imagen a Cloudinary)
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

// ✏️ 3. Actualizar una plantilla existente por ID (Subiendo imagen si cambió)
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

// ❌ 4. Eliminar una plantilla por ID
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

// 🚀 5. Migrar Base64 antiguos a Cloudinary en segundo plano usando índice _id
export const migrarImagenesBase64 = async (req, res) => {
  res.status(200).json({ 
    mensaje: "Migración iniciada en segundo plano. Revisa la pestaña Logs en Render para ver el progreso." 
  });

  try {
    console.log("🛠️ [MIGRACIÓN] Obteniendo IDs directamente del índice en RAM...");
    let plantillasMigradas = 0;
    let productosMigrados = 0;

    // Leer solo el índice _id de plantillas
    const templatesIds = await QrTemplate.find({})
      .select({ _id: 1 })
      .hint({ _id: 1 })
      .lean();

    console.log(`📋 [MIGRACIÓN] Total de plantillas a revisar: ${templatesIds.length}`);

    for (const item of templatesIds) {
      try {
        const tpl = await QrTemplate.findById(item._id).lean();
        if (tpl?.imagen && tpl.imagen.startsWith('data:image')) {
          console.log(`⏳ Subiendo imagen de plantilla ${item._id} a Cloudinary...`);
          const nuevaUrl = await subirImagenACloudinary(tpl.imagen);
          await QrTemplate.updateOne({ _id: item._id }, { $set: { imagen: nuevaUrl } });
          plantillasMigradas++;
          console.log(`✅ Plantilla migrada (${plantillasMigradas}): ${nuevaUrl}`);
        }
      } catch (innerErr) {
        console.error(`⚠️ Error en plantilla ${item._id}:`, innerErr.message);
      }
    }

    // Leer solo el índice _id de productos
    const productsIds = await Product.find({})
      .select({ _id: 1 })
      .hint({ _id: 1 })
      .lean();

    console.log(`📦 [MIGRACIÓN] Total de productos a revisar: ${productsIds.length}`);

    for (const item of productsIds) {
      try {
        const prod = await Product.findById(item._id).lean();
        if (prod?.imagen && prod.imagen.startsWith('data:image')) {
          console.log(`⏳ Subiendo imagen de producto ${item._id} a Cloudinary...`);
          const nuevaUrl = await subirImagenACloudinary(prod.imagen);
          await Product.updateOne({ _id: item._id }, { $set: { imagen: nuevaUrl } });
          productosMigrados++;
          console.log(`✅ Producto migrado (${productosMigrados}): ${nuevaUrl}`);
        }
      } catch (innerErr) {
        console.error(`⚠️ Error en producto ${item._id}:`, innerErr.message);
      }
    }

    console.log(`🎉 [MIGRACIÓN FINALIZADA] Plantillas: ${plantillasMigradas} | Productos: ${productosMigrados}`);
  } catch (err) {
    console.error("❌ Error general durante la migración:", err.message);
  }
};
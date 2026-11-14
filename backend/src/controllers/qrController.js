import QrTemplate from '../models/QrTemplate.js';
import Product from '../models/Product.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

const escaparRegex = (texto = '') => String(texto).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sincronizarImagenConInventario = async (plantilla) => {
  if (!plantilla?.imagen) return;

  try {
    const condiciones = [];

    if (plantilla.qrCode) {
      condiciones.push({ qrCode: plantilla.qrCode });
      condiciones.push({ id: plantilla.qrCode });
    }

    if (plantilla.marca && plantilla.estilo !== undefined && plantilla.color !== undefined) {
      condiciones.push({
        marca: new RegExp(`^${escaparRegex(plantilla.marca)}$`, 'i'),
        estilo: new RegExp(`^${escaparRegex(plantilla.estilo)}$`, 'i'),
        color: new RegExp(`^${escaparRegex(plantilla.color)}$`, 'i')
      });
    }

    if (condiciones.length > 0) {
      await Product.updateMany(
        { $or: condiciones },
        { $set: { imagen: plantilla.imagen } }
      );
    }
  } catch (err) {
    console.error("⚠️ Error al sincronizar imagen con el inventario:", err.message);
  }
};

// 📋 1. Obtener todas las plantillas
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

// ➕ 2. Crear una nueva plantilla
export const createTemplate = async (req, res) => {
  try {
    const datosPlantilla = { ...req.body };

    if (datosPlantilla.imagen && String(datosPlantilla.imagen).startsWith('data:image')) {
      datosPlantilla.imagen = await subirImagenACloudinary(datosPlantilla.imagen);
    }

    const nuevaPlantilla = new QrTemplate(datosPlantilla);
    const guardada = await nuevaPlantilla.save();

    await sincronizarImagenConInventario(guardada);

    return res.status(201).json(guardada);
  } catch (err) {
    console.error("❌ Error al guardar plantilla:", err.message);
    return res.status(400).json({ error: err.message });
  }
};

// ✏️ 3. Actualizar una plantilla existente por ID, qrCode o crearla si no existe
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizar = { ...req.body };
    delete datosActualizar._id;

    if (datosActualizar.imagen && String(datosActualizar.imagen).startsWith('data:image')) {
      datosActualizar.imagen = await subirImagenACloudinary(datosActualizar.imagen);
    }
    
    let actualizada = null;
    if (id && id.length === 24) {
      actualizada = await QrTemplate.findByIdAndUpdate(
        id, 
        datosActualizar, 
        { new: true, runValidators: false }
      );
    }

    if (!actualizada && datosActualizar.qrCode) {
      actualizada = await QrTemplate.findOneAndUpdate(
        { qrCode: datosActualizar.qrCode },
        datosActualizar,
        { new: true, runValidators: false }
      );
    }

    if (!actualizada && datosActualizar.marca && datosActualizar.estilo !== undefined && datosActualizar.color !== undefined) {
      actualizada = await QrTemplate.findOneAndUpdate(
        {
          marca: new RegExp(`^${escaparRegex(datosActualizar.marca)}$`, 'i'),
          estilo: new RegExp(`^${escaparRegex(datosActualizar.estilo)}$`, 'i'),
          color: new RegExp(`^${escaparRegex(datosActualizar.color)}$`, 'i')
        },
        datosActualizar,
        { new: true, runValidators: false }
      );
    }

    if (!actualizada) {
      const nueva = new QrTemplate(datosActualizar);
      actualizada = await nueva.save();
    }

    await sincronizarImagenConInventario(actualizada);

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

// 🚀 5. Migrar Base64 antiguos a Cloudinary y vincular fotos
export const migrarImagenesBase64 = async (req, res) => {
  res.status(200).json({ 
    mensaje: "Migración y sincronización iniciadas en segundo plano. Revisa los Logs en Render." 
  });

  try {
    let plantillasMigradas = 0;
    let productosMigrados = 0;

    const templatesIds = await QrTemplate.find({}).select({ _id: 1 }).hint({ _id: 1 }).lean();

    for (const item of templatesIds) {
      try {
        const tpl = await QrTemplate.findById(item._id).lean();
        if (!tpl) continue;

        if (tpl.imagen && tpl.imagen.startsWith('data:image')) {
          const nuevaUrl = await subirImagenACloudinary(tpl.imagen);
          await QrTemplate.updateOne({ _id: item._id }, { $set: { imagen: nuevaUrl } });
          tpl.imagen = nuevaUrl;
          plantillasMigradas++;
        }

        if (tpl.imagen) {
          await sincronizarImagenConInventario(tpl);
        }
      } catch (innerErr) {
        console.error(`⚠️ Error en plantilla ${item._id}:`, innerErr.message);
      }
    }

    const productsIds = await Product.find({}).select({ _id: 1 }).hint({ _id: 1 }).lean();

    for (const item of productsIds) {
      try {
        const prod = await Product.findById(item._id).lean();
        if (prod?.imagen && prod.imagen.startsWith('data:image')) {
          const nuevaUrl = await subirImagenACloudinary(prod.imagen);
          await Product.updateOne({ _id: item._id }, { $set: { imagen: nuevaUrl } });
          productosMigrados++;
        }
      } catch (innerErr) {
        console.error(`⚠️ Error en producto ${item._id}:`, innerErr.message);
      }
    }

    console.log(`🎉 [PROCESO FINALIZADO] Plantillas: ${plantillasMigradas} | Productos: ${productosMigrados}`);
  } catch (err) {
    console.error("❌ Error general durante la migración:", err.message);
  }
};
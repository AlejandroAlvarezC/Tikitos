import express from 'express';
import Product from '../models/Product.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

const router = express.Router();

// 🔍 Función auxiliar para buscar un producto por cualquier identificador válido
const buscarProductoPorCodigo = async (codigo) => {
  if (!codigo) return null;
  const codigoStr = String(codigo).trim();
  const condiciones = [{ qrCode: codigoStr }, { id: codigoStr }, { estilo: codigoStr }];

  if (/^[0-9a-fA-F]{24}$/.test(codigoStr)) {
    condiciones.push({ _id: codigoStr });
  }

  return await Product.findOne({ $or: condiciones });
};

// 📋 GET: Obtener todo el inventario con URLs ligeras de Cloudinary y allowDiskUse
router.get('/', async (req, res) => {
  try {
    const products = await Product.find()
      .lean()             
      .sort({ createdAt: -1 })
      .allowDiskUse(true); // 🌟 Previene errores de memoria en MongoDB Atlas al ordenar catálogos completos

    res.json(products);
  } catch (err) {
    console.error("Error al obtener el inventario:", err);
    res.status(500).json({ error: "Error al obtener el inventario" });
  }
});

// ➕ POST: Agregar un nuevo producto manualmente (con subida a Cloudinary)
router.post('/', async (req, res) => {
  try {
    const { imagen, ...restoDatos } = req.body;
    
    // 🌟 Subimos la imagen a Cloudinary (si es base64) y obtenemos la URL ligera
    const imagenUrl = await subirImagenACloudinary(imagen);

    const nuevoProducto = new Product({
      ...restoDatos,
      imagen: imagenUrl
    });

    const productoGuardado = await nuevoProducto.save();
    res.status(201).json(productoGuardado);
  } catch (err) {
    console.error("Error al guardar el producto:", err);
    res.status(400).json({ error: "Error al guardar el producto: " + err.message });
  }
});

// ✏️ PUT: Actualizar un producto (con subida a Cloudinary si cambia la imagen)
router.put('/:id', async (req, res) => {
  try {
    let datosActualizar = { ...req.body };

    // Si viene una nueva imagen en base64, la subimos a Cloudinary primero
    if (datosActualizar.imagen) {
      datosActualizar.imagen = await subirImagenACloudinary(datosActualizar.imagen);
    }

    const productoActualizado = await Product.findByIdAndUpdate(
      req.params.id, 
      datosActualizar, 
      { new: true }
    );

    if (!productoActualizado) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(productoActualizado);
  } catch (err) {
    console.error("Error al actualizar:", err);
    res.status(400).json({ error: "Error al actualizar el producto: " + err.message });
  }
});

// 🗑️ DELETE: Eliminar un producto
router.delete('/:id', async (req, res) => {
  try {
    const productoEliminado = await Product.findByIdAndDelete(req.params.id);
    if (!productoEliminado) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar:", err);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

// ➕ POST: Registrar entrada (con subida automática a Cloudinary)
router.post('/scan-entry', async (req, res) => {
  try {
    const { codigo, marca, estilo, color, pares, imagen } = req.body;
    if (!codigo) return res.status(400).json({ error: "Código QR no proporcionado." });

    const codigoStr = String(codigo).trim();
    let item = await buscarProductoPorCodigo(codigoStr);

    // 🌟 Subimos la imagen a Cloudinary si viene incluida
    const imagenUrl = await subirImagenACloudinary(imagen);

    const esMedia = codigoStr.toUpperCase().includes('MEDIA') || (item?.estilo && String(item.estilo).toUpperCase().includes('MEDIA'));
    const cantidadSumar = Number(pares) || (esMedia ? 6 : 1);

    if (item) {
      item.pares = Number(item.pares || 0) + cantidadSumar;
      if (marca) item.marca = String(marca);
      if (color) item.color = String(color);
      if (imagenUrl) item.imagen = String(imagenUrl);
      if (!item.qrCode) item.qrCode = codigoStr;
      await item.save();
      return res.json({
        success: true,
        message: `➕ Entrada registrada. Se sumaron ${cantidadSumar} pares. Total actual: ${item.pares} pares de "${item.estilo}".`,
        item
      });
    } else {
      const nuevaCantidad = Number(pares) || (esMedia ? 6 : 1);
      let estiloFinal = estilo ? String(estilo) : codigoStr;
      if (codigoStr.includes('MEDIA-')) {
        const partes = codigoStr.split('-');
        if (partes.length >= 3) estiloFinal = partes[2];
      }

      const nuevoProducto = new Product({
        qrCode: codigoStr,
        id: codigoStr,
        marca: marca ? String(marca) : (esMedia ? "Bebeto" : "Genérica"),
        estilo: estiloFinal,
        color: color ? String(color) : "Estándar",
        pares: nuevaCantidad,
        imagen: imagenUrl ? String(imagenUrl) : ""
      });
      const guardado = await nuevoProducto.save();
      return res.status(201).json({
        success: true,
        message: `✨ Producto nuevo creado con ${nuevaCantidad} pares iniciales.`,
        item: guardado
      });
    }
  } catch (err) {
    console.error("❌ Error en scan-entry:", err);
    res.status(500).json({ error: "Error en el servidor: " + err.message });
  }
});

// 📤 POST: Registrar salida (restar 6 pares si es media) por escaneo QR
router.post('/scan-exit', async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ error: "Código QR no proporcionado." });

    const codigoStr = String(codigo).trim();
    let item = await buscarProductoPorCodigo(codigoStr);

    if (!item) {
      return res.status(404).json({ error: `❌ El código "${codigoStr}" no está registrado en el inventario.` });
    }

    const esMedia = 
      codigoStr.toUpperCase().includes('MEDIA') || 
      (item.qrCode && String(item.qrCode).toUpperCase().includes('MEDIA')) ||
      (item.id && String(item.id).toUpperCase().includes('MEDIA')) ||
      (item.estilo && String(item.estilo).toUpperCase().includes('MEDIA'));

    const cantidadRestar = esMedia ? 6 : 1;

    if (Number(item.pares) < cantidadRestar) {
      return res.status(400).json({ error: `⚠️ No hay suficientes pares para retirar. Existencias actuales: ${item.pares}.` });
    }

    item.pares = Number(item.pares) - cantidadRestar;

    if (item.pares <= 0) {
      await Product.findByIdAndDelete(item._id);
      return res.json({ 
        success: true, 
        message: `🔥 Producto "${item.estilo}" agotado (se retiraron ${cantidadRestar} pares) y eliminado del inventario por completo.`,
        deletedCompletely: true,
        item 
      });
    } else {
      await item.save();
      return res.json({ 
        success: true, 
        message: `✅ Salida registrada. Se restaron ${cantidadRestar} pares. Restan ${item.pares} pares de "${item.estilo}".`,
        deletedCompletely: false,
        item 
      });
    }

  } catch (err) {
    console.error("❌ Error en scan-exit:", err);
    res.status(500).json({ error: "Error en el servidor: " + err.message });
  }
});

export default router;
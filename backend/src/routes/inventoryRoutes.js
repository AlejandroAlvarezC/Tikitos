import express from 'express';
import Product from '../models/Product.js';

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

// 📋 GET: Obtener todo el inventario optimizado (Evita que la red colapse por las imágenes en base64)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find()
      .select('-imagen') // 🌟 Excluye el campo de imagen pesada para que la lista cargue al instante
      .lean()             // 🌟 Convierte los documentos en objetos planos de JS (máxima velocidad)
      .sort({ createdAt: -1 })
      .limit(100);        // Límite de seguridad para evitar sobrecarga de red

    res.json(products);
  } catch (err) {
    console.error("Error al obtener el inventario:", err);
    res.status(500).json({ error: "Error al obtener el inventario" });
  }
});

// ➕ POST: Agregar un nuevo producto manualmente
router.post('/', async (req, res) => {
  try {
    const nuevoProducto = new Product(req.body);
    const productoGuardado = await nuevoProducto.save();
    res.status(201).json(productoGuardado);
  } catch (err) {
    console.error("Error al guardar el producto:", err);
    res.status(400).json({ error: "Error al guardar el producto" });
  }
});

// ✏️ PUT: Actualizar un producto
router.put('/:id', async (req, res) => {
  try {
    const productoActualizado = await Product.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    if (!productoActualizado) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(productoActualizado);
  } catch (err) {
    console.error("Error al actualizar:", err);
    res.status(400).json({ error: "Error al actualizar el producto" });
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

// ➕ POST: Registrar entrada (sumar 6 pares si es media)
router.post('/scan-entry', async (req, res) => {
  try {
    const { codigo, marca, estilo, color, pares, imagen } = req.body;
    if (!codigo) return res.status(400).json({ error: "Código QR no proporcionado." });

    const codigoStr = String(codigo).trim();
    let item = await buscarProductoPorCodigo(codigoStr);

    const esMedia = codigoStr.toUpperCase().includes('MEDIA') || (item?.estilo && String(item.estilo).toUpperCase().includes('MEDIA'));
    const cantidadSumar = Number(pares) || (esMedia ? 6 : 1);

    if (item) {
      item.pares = Number(item.pares || 0) + cantidadSumar;
      if (marca) item.marca = String(marca);
      if (color) item.color = String(color);
      if (imagen) item.imagen = String(imagen);
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
        imagen: imagen ? String(imagen) : ""
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

    // 🔍 Verificamos si es media revisando tanto el código como los campos guardados en la BD
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
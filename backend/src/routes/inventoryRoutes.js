import express from 'express';
import Product from '../models/Product.js';
import QrTemplate from '../models/QrTemplate.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

const router = express.Router();

// Auxiliar para comparar textos/números sin importar mayúsculas ni espacios
const crearRegexFlexible = (valor = '') => {
  const limpio = String(valor).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${limpio}\\s*$`, 'i');
};

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

// 🖼️ Función auxiliar para recuperar la foto desde QrTemplate automáticamente
const buscarImagenEnPlantilla = async ({ qrCode, id, codigo, marca, estilo, color }) => {
  try {
    const filtroConImagen = { imagen: { $exists: true, $nin: ["", null] } };
    const codigoFinal = qrCode || id || codigo;

    // 1. Buscar por qrCode exacto (ej. MEDIA-IMAGEN-I-12-340)
    if (codigoFinal) {
      const porQr = await QrTemplate.findOne({
        qrCode: crearRegexFlexible(codigoFinal),
        ...filtroConImagen
      }).sort({ _id: -1 }).lean();

      if (porQr?.imagen) return porQr.imagen;
    }

    // 2. Buscar por combinación de marca + estilo + color
    if (marca && estilo !== undefined && color !== undefined) {
      const porDatos = await QrTemplate.findOne({
        marca: crearRegexFlexible(marca),
        estilo: crearRegexFlexible(estilo),
        color: crearRegexFlexible(color),
        ...filtroConImagen
      }).sort({ _id: -1 }).lean();

      if (porDatos?.imagen) return porDatos.imagen;
    }

    return "";
  } catch (err) {
    console.error("⚠️ Error buscando imagen en plantilla:", err.message);
    return "";
  }
};

// 📋 GET: Obtener todo el inventario (ordenado por _id y autorreparando fotos faltantes)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({})
      .sort({ _id: -1 })
      .lean();

    // Si algún producto quedó con imagen: "", la recupera de su plantilla QrTemplate automáticamente
    await Promise.all(
      products.map(async (prod) => {
        if (!prod.imagen || String(prod.imagen).trim() === "") {
          const imgPlantilla = await buscarImagenEnPlantilla(prod);
          if (imgPlantilla) {
            const urlFinal = imgPlantilla.startsWith('data:image')
              ? await subirImagenACloudinary(imgPlantilla)
              : imgPlantilla;

            if (urlFinal) {
              prod.imagen = urlFinal;
              await Product.updateOne({ _id: prod._id }, { $set: { imagen: urlFinal } });
            }
          }
        }
      })
    );

    res.json(products);
  } catch (err) {
    console.error("Error al obtener el inventario:", err);
    res.status(500).json({ error: "Error al obtener el inventario" });
  }
});

// ➕ POST: Agregar un nuevo producto manualmente (con subida a Cloudinary o herencia de plantilla)
router.post('/', async (req, res) => {
  try {
    const { imagen, ...restoDatos } = req.body;
    
    let imagenUrl = "";
    if (imagen && String(imagen).startsWith('http')) {
      imagenUrl = imagen;
    } else if (imagen && String(imagen).startsWith('data:image')) {
      imagenUrl = await subirImagenACloudinary(imagen);
    }

    if (!imagenUrl) {
      imagenUrl = await buscarImagenEnPlantilla(restoDatos);
    }

    const nuevoProducto = new Product({
      ...restoDatos,
      imagen: imagenUrl || ""
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

    if (datosActualizar.imagen && String(datosActualizar.imagen).startsWith('data:image')) {
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

// ➕ POST: Registrar entrada por escaneo QR (heredando foto de QrTemplate automáticamente)
router.post('/scan-entry', async (req, res) => {
  try {
    const { codigo, marca, estilo, color, pares, imagen } = req.body;
    if (!codigo) return res.status(400).json({ error: "Código QR no proporcionado." });

    const codigoStr = String(codigo).trim();
    let item = await buscarProductoPorCodigo(codigoStr);

    let estiloFinal = estilo ? String(estilo) : codigoStr;
    if (codigoStr.includes('MEDIA-')) {
      const partes = codigoStr.split('-');
      if (partes.length >= 3) estiloFinal = partes[2];
    }

    // 1. Procesar imagen si viene en el body
    let imagenUrl = "";
    if (imagen && String(imagen).startsWith('http')) {
      imagenUrl = imagen;
    } else if (imagen && String(imagen).startsWith('data:image')) {
      imagenUrl = await subirImagenACloudinary(imagen);
    }

    // 2. Si el escaneo QR no trae imagen, buscarla automáticamente en QrTemplate
    if (!imagenUrl) {
      const imgPlantilla = await buscarImagenEnPlantilla({
        codigo: codigoStr,
        marca: marca || item?.marca,
        estilo: estiloFinal || item?.estilo,
        color: color || item?.color
      });
      if (imgPlantilla) {
        imagenUrl = imgPlantilla.startsWith('data:image')
          ? await subirImagenACloudinary(imgPlantilla)
          : imgPlantilla;
      }
    }

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
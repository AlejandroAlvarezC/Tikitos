import express from 'express';
import Product from '../models/Product.js';
import QrTemplate from '../models/QrTemplate.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

const router = express.Router();

// Auxiliar para comparar textos/números ignorando mayúsculas y espacios
const crearRegexFlexible = (valor = '') => {
  const limpio = String(valor).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${limpio}\\s*$`, 'i');
};

// Busca automáticamente la foto en QrTemplate por qrCode o por marca + estilo + color
const buscarImagenEnPlantilla = async ({ qrCode, id, marca, estilo, color }) => {
  try {
    const filtroConImagen = { imagen: { $exists: true, $nin: ["", null] } };
    const codigo = qrCode || id;

    // 1. Buscar por código QR exacto
    if (codigo) {
      const porQr = await QrTemplate.findOne({
        qrCode: crearRegexFlexible(codigo),
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

// 📋 1. Obtener inventario (con autorreparación automática de fotos faltantes)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({})
      .sort({ _id: -1 })
      .lean();

    // Si algún producto no tiene foto, la busca en QrTemplate y la guarda automáticamente
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

    return res.status(200).json(products);
  } catch (error) {
    console.error("❌ Error al obtener inventario:", error.message);
    return res.status(500).json({ message: "Error al obtener inventario: " + error.message });
  }
});

// ➕ 2. Agregar o escanear producto (hereda la foto de la plantilla automáticamente)
router.post('/', async (req, res) => {
  try {
    const { qrCode, id, estilo, color, pares, marca, imagen, tallas } = req.body;
    const codigoQR = qrCode || id;

    if (!codigoQR || estilo === undefined || color === undefined || !marca) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    // A. Si viene imagen en la petición, procesarla
    let imagenUrl = "";
    if (imagen && String(imagen).startsWith('http')) {
      imagenUrl = imagen;
    } else if (imagen && String(imagen).startsWith('data:image')) {
      imagenUrl = await subirImagenACloudinary(imagen);
    }

    // B. Si no viene imagen al escanear el QR, obtenerla automáticamente de QrTemplate
    if (!imagenUrl) {
      const imgPlantilla = await buscarImagenEnPlantilla({ qrCode: codigoQR, marca, estilo, color });
      if (imgPlantilla) {
        imagenUrl = imgPlantilla.startsWith('data:image')
          ? await subirImagenACloudinary(imgPlantilla)
          : imgPlantilla;
      }
    }

    // Buscar si ya existe el producto en el inventario
    let existingProduct = await Product.findOne({
      $or: [{ qrCode: codigoQR }, { id: codigoQR }]
    });

    if (existingProduct) {
      const paresASumar = Number(pares) || 1;
      existingProduct.pares = (Number(existingProduct.pares) || 0) + paresASumar;

      if (tallas && typeof tallas === 'object') {
        if (!existingProduct.tallas) existingProduct.tallas = new Map();
        for (const [tallaKey, cantidad] of Object.entries(tallas)) {
          const currentVal = existingProduct.tallas.get
            ? existingProduct.tallas.get(tallaKey) || 0
            : existingProduct.tallas[tallaKey] || 0;
          if (existingProduct.tallas.set) {
            existingProduct.tallas.set(tallaKey, currentVal + Number(cantidad));
          } else {
            existingProduct.tallas[tallaKey] = currentVal + Number(cantidad);
          }
        }
      }

      if (imagenUrl) {
        existingProduct.imagen = imagenUrl;
      }

      await existingProduct.save();
      return res.status(200).json(existingProduct);
    }

    // Crear producto nuevo ya con su foto de Cloudinary vinculada
    const newProduct = new Product({
      qrCode: String(codigoQR).trim(),
      id: String(codigoQR).trim(),
      estilo: String(estilo).trim(),
      color: String(color).trim(),
      pares: Number(pares) || 1,
      marca: String(marca).trim(),
      imagen: imagenUrl || "",
      tallas
    });

    const guardado = await newProduct.save();
    return res.status(201).json(guardado);
  } catch (error) {
    console.error("❌ Error al guardar producto:", error.message);
    return res.status(500).json({ message: "Error al guardar producto: " + error.message });
  }
});

// ✏️ 3. Actualizar un producto por ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizar = { ...req.body };

    if (datosActualizar.imagen && String(datosActualizar.imagen).startsWith('data:image')) {
      datosActualizar.imagen = await subirImagenACloudinary(datosActualizar.imagen);
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, datosActualizar, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("❌ Error al actualizar producto:", error.message);
    return res.status(500).json({ message: "Error al actualizar: " + error.message });
  }
});

// ❌ 4. Eliminar un producto por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar producto:", error.message);
    return res.status(500).json({ message: "Error al eliminar: " + error.message });
  }
});

export default router;
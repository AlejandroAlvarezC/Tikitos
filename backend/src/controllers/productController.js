import Product from '../models/Product.js';
import QrTemplate from '../models/QrTemplate.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

// Convierte números o textos de forma segura para comparar sin importar mayúsculas o espacios
const crearRegexFlexible = (valor = '') => {
  const limpio = String(valor).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${limpio}\\s*$`, 'i');
};

// Busca la imagen en QrTemplate asegurándose de que la plantilla sí tenga foto
const buscarImagenEnPlantilla = async ({ qrCode, marca, estilo, color }) => {
  try {
    const filtroConImagen = { imagen: { $exists: true, $nin: ["", null] } };

    // 1. Buscar primero por qrCode exacto
    if (qrCode) {
      const porQr = await QrTemplate.findOne({
        qrCode: String(qrCode).trim(),
        ...filtroConImagen
      }).sort({ _id: -1 }).lean();

      if (porQr?.imagen) return porQr.imagen;
    }

    // 2. Buscar por marca + estilo + color (soporta números como 5 o 55 y textos)
    if (marca && estilo !== undefined && color !== undefined) {
      const porDatos = await QrTemplate.findOne({
        marca: crearRegexFlexible(marca),
        estilo: crearRegexFlexible(estilo),
        color: crearRegexFlexible(color),
        ...filtroConImagen
      }).sort({ _id: -1 }).lean();

      if (porDatos?.imagen) return porDatos.imagen;
    }

    // 3. Respaldo por marca + estilo
    if (marca && estilo !== undefined) {
      const porMarcaEstilo = await QrTemplate.findOne({
        marca: crearRegexFlexible(marca),
        estilo: crearRegexFlexible(estilo),
        ...filtroConImagen
      }).sort({ _id: -1 }).lean();

      if (porMarcaEstilo?.imagen) return porMarcaEstilo.imagen;
    }

    return "";
  } catch (err) {
    console.error("⚠️ Error al buscar imagen en plantilla:", err.message);
    return "";
  }
};

// 1. Agregar o acumular producto si el QR ya existe (heredando foto de la plantilla)
export const addProduct = async (req, res) => {
  try {
    const { qrCode, estilo, color, pares, marca, imagen, tallas } = req.body;
    
    if (!qrCode || estilo === undefined || color === undefined || !marca) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    // A. Procesar imagen si viene en la petición (URL directa o Base64)
    let imagenUrl = "";
    if (imagen && String(imagen).startsWith('http')) {
      imagenUrl = imagen;
    } else if (imagen && String(imagen).startsWith('data:image')) {
      const subida = await subirImagenACloudinary(imagen);
      imagenUrl = subida || imagen;
    }

    // B. Si el escaneo del QR no incluye la imagen, la buscamos en la plantilla (QrTemplate)
    if (!imagenUrl) {
      const imgPlantilla = await buscarImagenEnPlantilla({ qrCode, marca, estilo, color });
      if (imgPlantilla) {
        imagenUrl = imgPlantilla.startsWith('data:image')
          ? await subirImagenACloudinary(imgPlantilla)
          : imgPlantilla;
      }
    }

    // Buscar si ya existe un producto con este mismo código QR en inventario
    let existingProduct = await Product.findOne({ qrCode });

    if (existingProduct) {
      const paresASumar = Number(pares) || 1;
      existingProduct.pares = (Number(existingProduct.pares) || 0) + paresASumar;

      if (tallas && typeof tallas === 'object') {
        if (!existingProduct.tallas) {
          existingProduct.tallas = new Map();
        }
        for (const [tallaKey, cantidad] of Object.entries(tallas)) {
          const currentVal = existingProduct.tallas.get(tallaKey) || 0;
          existingProduct.tallas.set(tallaKey, currentVal + Number(cantidad));
        }
      }

      if (imagenUrl) {
        existingProduct.imagen = imagenUrl;
      }

      await existingProduct.save();
      return res.status(200).json({ 
        message: "¡Producto actualizado! Se sumaron los pares correctamente.", 
        product: existingProduct 
      });
    }

    // Si no existe, se crea el producto con la imagen obtenida
    const newProduct = new Product({
      qrCode: String(qrCode).trim(), 
      estilo: String(estilo).trim(), 
      color: String(color).trim(), 
      pares: Number(pares) || 1, 
      marca: String(marca).trim(),
      imagen: imagenUrl || "",
      tallas
    });
    
    await newProduct.save();
    return res.status(201).json(newProduct);

  } catch (error) {
    console.error("❌ Error al guardar el producto:", error);
    return res.status(500).json({ message: "Error al guardar en la base de datos: " + error.message });
  }
};

// 2. Obtener inventario y autorreparar productos que estén "Sin foto"
export const getInventory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; 
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find({})
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.estimatedDocumentCount()
    ]);

    // 🌟 Si algún producto en la tabla no tiene foto, la busca en QrTemplate y lo actualiza
    await Promise.all(
      products.map(async (prod) => {
        if (!prod.imagen || String(prod.imagen).trim() === "") {
          const imgEncontrada = await buscarImagenEnPlantilla(prod);
          if (imgEncontrada) {
            prod.imagen = imgEncontrada;
            await Product.updateOne({ _id: prod._id }, { $set: { imagen: imgEncontrada } });
          }
        }
      })
    );
      
    return res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("❌ Error al obtener el inventario:", error);
    return res.status(500).json({ message: "Error al consultar la base de datos: " + error.message });
  }
};

// 3. Actualizar un producto por ID (con Cloudinary solo si es Base64 nuevo)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let datosActualizar = { ...req.body };

    if (datosActualizar.imagen && String(datosActualizar.imagen).startsWith('data:image')) {
      datosActualizar.imagen = await subirImagenACloudinary(datosActualizar.imagen);
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, datosActualizar, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("❌ Error al actualizar producto:", error);
    return res.status(500).json({ message: "Error al actualizar en la base de datos: " + error.message });
  }
};

// 4. Eliminar un producto por ID
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar producto:", error);
    return res.status(500).json({ message: "Error al eliminar en la base de datos: " + error.message });
  }
};
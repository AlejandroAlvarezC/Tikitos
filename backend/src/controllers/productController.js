import Product from '../models/Product.js';
import QrTemplate from '../models/QrTemplate.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

// 1. Agregar o acumular producto si el QR ya existe (heredando foto de la plantilla)
export const addProduct = async (req, res) => {
  try {
    const { qrCode, estilo, color, pares, marca, imagen, tallas } = req.body;
    
    if (!qrCode || !estilo || !color || !marca) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    // 🌟 A. Procesar imagen si viene en la petición (URL directa o Base64)
    let imagenUrl = "";
    if (imagen && imagen.startsWith('http')) {
      imagenUrl = imagen;
    } else if (imagen && imagen.startsWith('data:image')) {
      imagenUrl = await subirImagenACloudinary(imagen);
    }

    // 🌟 B. Si el escaneo del QR no incluye la imagen, la buscamos en la plantilla (QrTemplate)
    if (!imagenUrl) {
      let plantillaAsociada = await QrTemplate.findOne({ qrCode }).sort({ _id: -1 }).lean();

      if (!plantillaAsociada) {
        plantillaAsociada = await QrTemplate.findOne({ 
          marca: new RegExp(`^${marca.trim()}$`, 'i'),
          estilo: new RegExp(`^${estilo.trim()}$`, 'i'),
          color: new RegExp(`^${color.trim()}$`, 'i')
        }).sort({ _id: -1 }).lean();
      }

      if (plantillaAsociada?.imagen) {
        imagenUrl = plantillaAsociada.imagen.startsWith('data:image')
          ? await subirImagenACloudinary(plantillaAsociada.imagen)
          : plantillaAsociada.imagen;
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

      // 🌟 Si encontramos imagen (o se actualizó en la plantilla), se la asignamos al producto
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
      qrCode, 
      estilo, 
      color, 
      pares: Number(pares) || 1, 
      marca,
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

// 2. Obtener inventario instantáneo usando índice nativo _id
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

    if (datosActualizar.imagen && datosActualizar.imagen.startsWith('data:image')) {
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
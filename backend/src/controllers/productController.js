import Product from '../models/Product.js';
import { subirImagenACloudinary } from '../utils/cloudinaryHelper.js';

// 1. Agregar o acumular producto si el QR ya existe (con Cloudinary)
export const addProduct = async (req, res) => {
  try {
    const { qrCode, estilo, color, pares, marca, imagen, tallas } = req.body;
    
    if (!qrCode || !estilo || !color || !marca) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const imagenUrl = await subirImagenACloudinary(imagen);

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

      if (imagenUrl && !existingProduct.imagen) {
        existingProduct.imagen = imagenUrl;
      }

      await existingProduct.save();
      return res.status(200).json({ 
        message: "¡Producto actualizado! Se sumaron los pares correctamente.", 
        product: existingProduct 
      });
    }

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

// 2. Obtener inventario instantáneo usando índice nativo _id y metadatos
export const getInventory = async (req, res) => {
  console.log("📥 ¡Petición recibida en /api/inventory!");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; 
    const skip = (page - 1) * limit;

    // Ejecutamos consulta y conteo rápido en paralelo
    const [products, total] = await Promise.all([
      Product.find({})
        .sort({ _id: -1 }) // Índice nativo: no consume RAM ni disco al ordenar
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.estimatedDocumentCount() // Lee metadatos al instante sin escanear toda la colección
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

// 3. Actualizar un producto por ID (con Cloudinary si cambia la imagen)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let datosActualizar = { ...req.body };

    if (datosActualizar.imagen) {
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
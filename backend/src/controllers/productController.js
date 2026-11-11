import Product from '../models/Product.js';

// 1. Agregar o acumular producto si el QR ya existe
export const addProduct = async (req, res) => {
  try {
    const { qrCode, estilo, color, pares, marca, imagen, tallas } = req.body;
    
    if (!qrCode || !estilo || !color || !marca) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    // Buscar si ya existe un producto con este mismo código QR
    let existingProduct = await Product.findOne({ qrCode });

    if (existingProduct) {
      // 🌟 Si ya existe, sumamos los nuevos pares a los que ya tenía
      const paresASumar = Number(pares) || 1;
      existingProduct.pares = (Number(existingProduct.pares) || 0) + paresASumar;

      // Si trae desglose de tallas (como en media docena), las sumamos una por una
      if (tallas && typeof tallas === 'object') {
        if (!existingProduct.tallas) {
          existingProduct.tallas = new Map();
        }
        for (const [tallaKey, cantidad] of Object.entries(tallas)) {
          const currentVal = existingProduct.tallas.get(tallaKey) || 0;
          existingProduct.tallas.set(tallaKey, currentVal + Number(cantidad));
        }
      }

      // Si viene una imagen nueva y no tenía, se la asignamos
      if (imagen && !existingProduct.imagen) {
        existingProduct.imagen = imagen;
      }

      await existingProduct.save();
      return res.status(200).json({ 
        message: "¡Producto actualizado! Se sumaron los pares correctamente.", 
        product: existingProduct 
      });
    }

    // Si no existe, se crea un registro completamente nuevo
    const newProduct = new Product({
      qrCode, 
      estilo, 
      color, 
      pares: Number(pares) || 1, 
      marca,
      imagen,
      tallas
    });
    
    await newProduct.save();
    res.status(201).json(newProduct);

  } catch (error) {
    console.error("Error al guardar el producto:", error);
    res.status(500).json({ message: "Error al guardar en la base de datos" });
  }
};

// 2. Obtener todo el inventario (Con ordenamiento y allowDiskUse para evitar errores de memoria)
export const getInventory = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .allowDiskUse(true); // 👈 Esto evita el límite de los 32MB en MongoDB Atlas
      
    res.status(200).json(products);
  } catch (error) {
    console.error("Error al obtener el inventario:", error);
    res.status(500).json({ message: "Error al consultar la base de datos" });
  }
};

// 3. Actualizar un producto por ID
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ message: "Error al actualizar en la base de datos" });
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

    res.status(200).json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ message: "Error al eliminar en la base de datos" });
  }
};
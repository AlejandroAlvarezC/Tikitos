// Ejemplo dentro de tu productController.js
const getInventory = async (req, res) => {
  try {
    // 🌟 Agregamos .allowDiskUse(true) aquí
    const products = await Product.find({}).sort({ createdAt: -1 }).allowDiskUse(true);
    
    res.status(200).json(products);
  } catch (err) {
    console.error("Error al obtener el inventario:", err);
    res.status(500).json({ error: "Error al obtener el inventario" });
  }
};
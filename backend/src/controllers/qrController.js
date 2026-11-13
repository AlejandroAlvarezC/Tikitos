// 🚀 Migración en segundo plano usando índice cubierto (_id)
export const migrarImagenesBase64 = async (req, res) => {
  // 1. Respondemos de inmediato al navegador para evitar timeouts y reintentos de Chrome
  res.status(200).json({ 
    mensaje: "Migración iniciada en segundo plano. Revisa la pestaña Logs en Render para ver el progreso." 
  });

  try {
    console.log("🛠️ [MIGRACIÓN] Obteniendo IDs directamente del índice en RAM...");
    let plantillasMigradas = 0;
    let productosMigrados = 0;

    // Forzamos a MongoDB a leer SOLO el índice _id sin tocar los documentos en disco
    const templatesIds = await QrTemplate.find({})
      .select({ _id: 1 })
      .hint({ _id: 1 })
      .lean();

    console.log(`📋 [MIGRACIÓN] Total de plantillas a revisar: ${templatesIds.length}`);

    for (const item of templatesIds) {
      try {
        const tpl = await QrTemplate.findById(item._id).lean();
        if (tpl?.imagen && tpl.imagen.startsWith('data:image')) {
          console.log(`⏳ Subiendo imagen de plantilla ${item._id} a Cloudinary...`);
          const nuevaUrl = await subirImagenACloudinary(tpl.imagen);
          await QrTemplate.updateOne({ _id: item._id }, { $set: { imagen: nuevaUrl } });
          plantillasMigradas++;
          console.log(`✅ Plantilla migrada (${plantillasMigradas}): ${nuevaUrl}`);
        }
      } catch (innerErr) {
        console.error(`⚠️ Error en plantilla ${item._id}:`, innerErr.message);
      }
    }

    const productsIds = await Product.find({})
      .select({ _id: 1 })
      .hint({ _id: 1 })
      .lean();

    console.log(`📦 [MIGRACIÓN] Total de productos a revisar: ${productsIds.length}`);

    for (const item of productsIds) {
      try {
        const prod = await Product.findById(item._id).lean();
        if (prod?.imagen && prod.imagen.startsWith('data:image')) {
          console.log(`⏳ Subiendo imagen de producto ${item._id} a Cloudinary...`);
          const nuevaUrl = await subirImagenACloudinary(prod.imagen);
          await Product.updateOne({ _id: item._id }, { $set: { imagen: nuevaUrl } });
          productosMigrados++;
          console.log(`✅ Producto migrado (${productosMigrados}): ${nuevaUrl}`);
        }
      } catch (innerErr) {
        console.error(`⚠️ Error en producto ${item._id}:`, innerErr.message);
      }
    }

    console.log(`🎉 [MIGRACIÓN FINALIZADA] Plantillas: ${plantillasMigradas} | Productos: ${productosMigrados}`);
  } catch (err) {
    console.error("❌ Error general durante la migración:", err.message);
  }
};
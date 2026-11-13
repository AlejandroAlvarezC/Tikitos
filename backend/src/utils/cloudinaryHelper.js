import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary con las variables de entorno de Render
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Función para procesar, comprimir y subir la imagen si viene en Base64
export const subirImagenACloudinary = async (imagenInput) => {
  // Si no hay imagen, viene vacía, o ya es una URL web externa, la retornamos tal cual
  if (!imagenInput || !imagenInput.startsWith('data:image')) {
    return imagenInput; 
  }

  try {
    const uploadResponse = await cloudinary.uploader.upload(imagenInput, {
      folder: 'tikitos-inventario',
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto:good' } // Comprime y optimiza automáticamente
      ]
    });
    
    return uploadResponse.secure_url; // 🌟 Retorna únicamente el enlace web seguro (URL corta)
  } catch (err) {
    console.error("❌ Error al subir imagen a Cloudinary:", err);
    throw new Error("No se pudo cargar la imagen a la nube.");
  }
};
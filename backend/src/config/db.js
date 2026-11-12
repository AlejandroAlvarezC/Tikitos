import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Aumentamos a 10s para dar margen a Render
      socketTimeoutMS: 45000,          // Evita que se cierre el socket por inactividad rápida
      family: 4                        // Fuerza el uso de IPv4 (evita problemas de resolución DNS en la nube)
    });
    console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
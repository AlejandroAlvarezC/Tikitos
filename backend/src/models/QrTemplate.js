import mongoose from 'mongoose';

const qrTemplateSchema = new mongoose.Schema({
  tipo: { type: String, required: true }, // 'individual' o 'media'
  nombre: { type: String },
  marca: { type: String, required: true },
  estilo: { type: String, required: true },
  color: { type: String, required: true },
  qrCode: { type: String, unique: true, sparse: true },
  imagen: { type: String }, // Base64
  tallas: {
    type: Object,
    default: { "10": 2, "11": 2, "12": 2 }
  }
}, { timestamps: true }); 

// 🌟 Creamos un índice físico ordenado descendentemente para evitar errores de memoria en el sort
qrTemplateSchema.index({ createdAt: -1 });

const QrTemplate = mongoose.model('QrTemplate', qrTemplateSchema);
export default QrTemplate;
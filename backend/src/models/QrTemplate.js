import mongoose from 'mongoose';

const qrTemplateSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['individual', 'media'], required: true },
  marca: { type: String, required: true },
  estilo: { type: String, required: true },
  color: { type: String, required: true },
  qrCode: { type: String, required: true, unique: true },
  imagen: { type: String, default: "" }, // 🌟 Campo nuevo para guardar la foto
  tallas: {
    type: Map,
    of: Number,
    default: undefined
  }
}, { timestamps: true });

export default mongoose.model('QrTemplate', qrTemplateSchema);
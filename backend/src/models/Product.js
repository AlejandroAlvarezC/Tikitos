import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  qrCode: { type: String, required: true, unique: true },
  estilo: { type: String, required: true },
  color: { type: String, required: true },
  pares: { type: Number, required: true, default: 1 },
  marca: { type: String, required: true },
  imagen: { type: String },
  tallas: { 
    type: Map, 
    of: Number, 
    default: undefined 
  }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
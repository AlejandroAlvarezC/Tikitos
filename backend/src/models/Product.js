import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  qrCode: { type: String, required: true },
  id: { type: String },
  estilo: { type: String, required: true },
  color: { type: String, required: true },
  marca: { type: String, required: true },
  pares: { type: Number, default: 1 },
  imagen: { type: String },
  tallas: { type: Map, of: Number }
}, {
  timestamps: true
});

// 🌟 AGREGAR ESTOS ÍNDICES PARA BÚSQUEDAS INSTÁNTANEAS
productSchema.index({ qrCode: 1 });
productSchema.index({ id: 1 });
productSchema.index({ estilo: 1 });
productSchema.index({ createdAt: -1 }); // El que corregimos antes para el inventario

const Product = mongoose.model('Product', productSchema);
export default Product;
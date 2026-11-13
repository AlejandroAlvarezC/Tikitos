import mongoose from 'mongoose';

const qrTemplateSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: [true, 'El campo nombre es obligatorio'], 
    trim: true 
  },
  contenido: { 
    type: String, 
    default: '' 
  },
  ancho: { 
    type: Number, 
    default: 200 
  },
  alto: { 
    type: Number, 
    default: 200 
  },
  elementos: { 
    type: Array, 
    default: [] 
  }
}, {
  timestamps: true // Añade automáticamente createdAt y updatedAt
});

const QrTemplate = mongoose.model('QrTemplate', qrTemplateSchema);

export default QrTemplate;
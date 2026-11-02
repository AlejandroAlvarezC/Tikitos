import { useState, useEffect } from "react";
import { API_URL } from "../config";

export default function AddProduct({ onProductAdded, codigoEscaneado }) {
  const [formData, setFormData] = useState({
    id: "",
    marca: "",
    estilo: "",
    color: "",
    pares: "",
    imagen: ""
  });

  const [productExistente, setProductExistente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    if (codigoEscaneado) {
      const rawText = typeof codigoEscaneado === 'object' && codigoEscaneado !== null 
        ? codigoEscaneado.text 
        : codigoEscaneado;

      if (!rawText || typeof rawText !== 'string') return;

      let codigoLimpio = rawText;
      let datosParsed = {};

      try {
        const parsed = JSON.parse(rawText);
        if (typeof parsed === 'object' && parsed !== null) {
          codigoLimpio = String(parsed.qrCode || parsed.id || parsed.estilo || rawText);
          datosParsed = parsed;
        }
      } catch (e) {
        codigoLimpio = rawText;
      }

      const esMedia = codigoLimpio.toUpperCase().includes('MEDIA');

      setFormData({
        id: codigoLimpio,
        marca: datosParsed.marca ? String(datosParsed.marca).trim() : (esMedia ? "Bebeto" : ""),
        estilo: datosParsed.estilo ? String(datosParsed.estilo) : (esMedia ? "07" : ""),
        color: datosParsed.color ? String(datosParsed.color).trim() : "",
        pares: datosParsed.pares ? Number(datosParsed.pares) : (esMedia ? 6 : ""),
        imagen: datosParsed.imagen ? String(datosParsed.imagen) : ""
      });

      verificarProducto(codigoLimpio);
    }
  }, [codigoEscaneado]);

  const verificarProducto = async (codigo) => {
    try {
      const res = await fetch(`${API_URL}/api/inventory`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.products || []);

      const codigoStr = String(codigo).trim();
      const encontrado = items.find(item => 
        item.qrCode === codigoStr || 
        item.id === codigoStr || 
        item._id === codigoStr || 
        item.estilo === codigoStr
      );

      if (encontrado) {
        setProductExistente(encontrado);
        setMensaje({ 
          tipo: "info", 
          texto: `⚠️ Producto encontrado en inventario (${encontrado.pares} pares actuales). Al guardar se sumarán 6 pares. O usa el botón rojo para restar 6.` 
        });
      } else {
        setProductExistente(null);
        setMensaje({ 
          tipo: "success", 
          texto: "✨ Código analizado. Es un producto nuevo, se registrará con los datos del QR." 
        });
      }
    } catch (err) {
      console.error("Error al verificar producto:", err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        codigo: formData.id
      };

      const res = await fetch(`${API_URL}/api/inventory/scan-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar la entrada");

      alert(data.message);
      if (onProductAdded) onProductAdded();
    } catch (err) {
      alert("Hubo un error al procesar la solicitud: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarSalida = async () => {
    // Priorizamos estrictamente el _id real de MongoDB del producto encontrado
    const codigoAEnviar = productExistente?._id || productExistente?.qrCode || productExistente?.id || formData.id;

    if (!codigoAEnviar) {
      alert("No hay un código válido para restar.");
      return;
    }

    const confirmar = window.confirm(`⚠️ ¿Deseas restar 6 pares / dar salida al producto "${formData.estilo}"?`);
    if (!confirmar) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/inventory/scan-exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoAEnviar }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar la salida");

      alert(data.message);
      if (onProductAdded) onProductAdded();
    } catch (err) {
      alert("Error: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-gray-800">📦 Gestión de Producto por QR (+6 / -6)</h2>

      {mensaje && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${
          mensaje.tipo === "info" ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Código QR / ID</label>
          <input
            type="text"
            name="id"
            value={formData.id}
            onChange={handleChange}
            placeholder="Escanea un QR o escríbelo aquí"
            className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Marca</label>
            <input
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              placeholder="ej. Bebeto"
              className="w-full p-2.5 text-sm border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Estilo</label>
            <input
              type="text"
              name="estilo"
              value={formData.estilo}
              onChange={handleChange}
              placeholder="ej. 07"
              className="w-full p-2.5 text-sm border border-gray-300 rounded-lg"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Color</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="ej. Blanco - Blanco"
              className="w-full p-2.5 text-sm border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Pares</label>
            <input
              type="number"
              name="pares"
              value={formData.pares}
              onChange={handleChange}
              placeholder="ej. 6"
              className="w-full p-2.5 text-sm border border-gray-300 rounded-lg"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Imagen (URL)</label>
          <input
            type="text"
            name="imagen"
            value={formData.imagen}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full p-2.5 text-sm border border-gray-300 rounded-lg"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm"
          >
            {loading ? "Procesando..." : productExistente ? "Sumar 6 Pares" : "Guardar (6 Pares)"}
          </button>

          {productExistente && (
            <button
              type="button"
              onClick={handleEliminarSalida}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition shadow-sm"
            >
              Restar 6 Pares
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
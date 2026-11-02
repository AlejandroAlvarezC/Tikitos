import { useState, useEffect } from "react";
import LectorQR from "./LectorQR";
import { API_URL } from "../config";

export default function ScanOut({ onInventoryUpdated }) {
  const [codigoQR, setCodigoQR] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [tipoAlerta, setTipoAlerta] = useState(""); // "success" o "error"

  // Función que procesa el código escaneado automáticamente
  const procesarSalidaQR = async (codigo) => {
    if (!codigo || loading) return;

    setLoading(true);
    setMensaje(null);

    try {
      const res = await fetch(`${API_URL}/api/inventory/scan-exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el código QR");
      }

      setTipoAlerta("success");
      setMensaje(data.message);
      
      // Notificar al componente principal para que refresque la tabla de inventario
      if (onInventoryUpdated) {
        onInventoryUpdated();
      }

      // Limpiar el código después de unos segundos para permitir otro escaneo
      setTimeout(() => {
        setCodigoQR("");
        setMensaje(null);
      }, 4000);

    } catch (err) {
      setTipoAlerta("error");
      setMensaje(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cada vez que el lector detecte un nuevo QR, procesarlo
  useEffect(() => {
    if (codigoQR) {
      procesarSalidaQR(codigoQR);
    }
  }, [codigoQR]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-800">📤 Escanear para Salida / Retiro</h2>
        <p className="text-sm text-gray-500">
          Apunta la cámara al código QR del producto para descontar pares o retirarlo del inventario.
        </p>
      </div>

      {/* Lector de QR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <LectorQR onScanSuccess={setCodigoQR} codigoActual={codigoQR} />
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-center font-medium animate-pulse">
          ⏳ Verificando existencia y procesando salida...
        </div>
      )}

      {/* Mensaje de éxito o error */}
      {mensaje && (
        <div className={`p-4 rounded-xl border text-center font-medium shadow-sm transition-all ${
          tipoAlerta === "success" 
            ? "bg-green-50 border-green-200 text-green-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {mensaje}
        </div>
      )}
    </div>
  );
}
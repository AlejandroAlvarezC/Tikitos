import { useState, useEffect } from "react";
import Inventory from "./pages/Inventory";
import AddProduct from "./components/AddProduct";
import LectorQR from "./components/LectorQR";
import GenerateQR from "./components/GenerateQR";
import Navbar from "./components/Navbar";

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0); 
  
  // 🌟 Ahora guardamos un objeto con el texto y un timestamp para forzar el re-escaneo del mismo código
  const [codigoQR, setCodigoQR] = useState(null);

  // 🌟 Inicializamos el estado leyendo de localStorage para que persista al recargar
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });

  const [activeTab, setActiveTab] = useState("inventory");

  // 🌟 Cada vez que cambie isAdmin, lo guardamos en localStorage
  useEffect(() => {
    localStorage.setItem("isAdmin", isAdmin);
  }, [isAdmin]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1); 
    setActiveTab("inventory");
  };

  const handleScanSuccess = (textoEscaneado) => {
    setCodigoQR({
      text: textoEscaneado,
      time: Date.now() // Esto garantiza que aunque sea el mismo código, cambie el estado
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
      <div>
        <Navbar isAdmin={isAdmin} setIsAdmin={setIsAdmin} />

        <header className="max-w-5xl mx-auto mt-6 px-4 md:px-0 mb-6 text-center md:text-left print:hidden">
          <h1 className="text-3xl font-extrabold text-blue-900">
            Inventario Tikitos 📦
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {isAdmin ? "Panel de Administración y Gestión" : "Catálogo y Consulta de Inventario"}
          </p>
        </header>

        {isAdmin && (
          <div className="max-w-5xl mx-auto px-4 md:px-0 mb-6 flex flex-wrap gap-2 print:hidden">
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-semibold text-sm transition shadow-sm ${
                activeTab === "inventory"
                  ? "bg-blue-600 text-white shadow-blue-200"
                  : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-200"
              }`}
            >
              📋 Inventario
            </button>

            <button
              onClick={() => setActiveTab("add")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-semibold text-sm transition shadow-sm ${
                activeTab === "add"
                  ? "bg-blue-600 text-white shadow-blue-200"
                  : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-200"
              }`}
            >
              ➕ Escanear y Gestionar
            </button>

            <button
              onClick={() => setActiveTab("generate-qr")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-semibold text-sm transition shadow-sm ${
                activeTab === "generate-qr"
                  ? "bg-blue-600 text-white shadow-blue-200"
                  : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-200"
              }`}
            >
              🖨️ Generar QR
            </button>
          </div>
        )}

        <main className="max-w-5xl mx-auto px-4 md:px-0 pb-12">
          {activeTab === "inventory" && (
            <Inventory key={refreshKey} isAdmin={isAdmin} />
          )}

          {isAdmin && activeTab === "add" && (
            <div className="space-y-6">
              <LectorQR 
                onScanSuccess={handleScanSuccess} 
                codigoActual={codigoQR?.text} 
              />
              <AddProduct 
                onProductAdded={handleRefresh} 
                codigoEscaneado={codigoQR} 
              />
            </div>
          )}

          {isAdmin && activeTab === "generate-qr" && (
            <GenerateQR />
          )}
        </main>
      </div>
    </div>
  );
}
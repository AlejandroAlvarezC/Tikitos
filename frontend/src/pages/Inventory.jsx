import { useEffect, useState, useCallback } from "react";
import { API_URL } from "../config";
import Footer from "../components/Footer";

// Helper para asignar colores distintivos a cada marca
const getMarcaEstilo = (marca) => {
  const m = String(marca).trim().toUpperCase();
  if (m.includes("BEBETO")) {
    return "text-red-600 bg-red-50 border-red-200 print:text-red-600";
  }
  if (m.includes("TIKITOS")) {
    return "text-green-600 bg-green-50 border-green-200 print:text-green-600";
  }
  if (m.includes("FISHER")) {
    return "text-blue-600 bg-blue-50 border-blue-200 print:text-blue-600";
  }
  return "text-gray-700 bg-gray-50 border-gray-200 print:text-black";
};

export default function Inventory({ isAdmin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedMarca, setSelectedMarca] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    estilo: "",
    color: "",
    pares: "",
    marca: ""
  });

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/inventory`);
      if (!res.ok) throw new Error("Error en la respuesta del servidor");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : (data.products || []));
      setError(null);
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handlePrint = () => {
    window.print();
  };

  const iniciarEdicion = (item) => {
    if (!isAdmin) return;
    const id = item._id || item.id;
    setEditingId(id);
    setEditFormData({
      estilo: item.estilo,
      color: item.color,
      pares: item.pares,
      marca: item.marca
    });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const guardarEdicion = async (id) => {
    if (!isAdmin) return;
    const confirmar = window.confirm("¿Estás seguro de que deseas guardar estos cambios?");
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      setItems(items.map(item => (item._id === id || item.id === id) ? { ...item, ...editFormData } : item));
      setEditingId(null);
    } catch (err) {
      alert("Hubo un error al guardar los cambios.");
      console.error(err);
    }
  };

  const eliminarProducto = async (id) => {
    if (!isAdmin) return;
    const confirmar = window.confirm("⚠️ ¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/api/inventory/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar");

      setItems(items.filter(item => item._id !== id && item.id !== id));
    } catch (err) {
      alert("Hubo un error al eliminar el producto.");
      console.error(err);
    }
  };

  const marcasDisponibles = [...new Set(items.map((item) => item.marca).filter(Boolean))];
  const coloresDisponibles = [...new Set(items.map((item) => item.color).filter(Boolean))];

  const itemsFiltrados = items.filter((item) => {
    const coincideMarca = selectedMarca === "" || item.marca === selectedMarca;
    const coincideColor = selectedColor === "" || item.color === selectedColor;
    return coincideMarca && coincideColor;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 text-lg font-medium">Cargando inventario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl shadow-sm border border-red-100 p-8 text-center">
        <p className="text-red-600 font-medium mb-4 text-lg">⚠️ {error}</p>
        <button onClick={fetchInventory} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-lg">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col justify-between space-y-4 px-2 sm:px-4 pb-4">
      
      <div className="space-y-4 flex-grow">
        
        {/* --- TARJETA UNIFICADA: Título, Logo Redondeado y Filtros --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-5 print:hidden">
          
          {/* Fila Superior: Título / Subtítulo e Imagen con bordes redondeados */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
                Inventario Tikitos 📦
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {isAdmin ? "Gestiona y consulta los modelos disponibles en almacén." : "Consulta el catálogo de modelos disponibles."}
              </p>
            </div>

            {/* Logo con bordes redondeados */}
            <div className="overflow-hidden rounded-2xl shadow-md border border-gray-200 flex-shrink-0">
              <img 
                src="/logo-tikitos.png" 
                alt="Tikitos Logo" 
                className="h-16 sm:h-20 w-auto object-cover"
              />
            </div>
          </div>

          {/* Fila Inferior: Filtros de Marca y Color */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <h2 className="text-base font-bold text-gray-700">📦 Inventario Activo</h2>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <select
                value={selectedMarca}
                onChange={(e) => setSelectedMarca(e.target.value)}
                className="flex-1 sm:flex-none p-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las marcas</option>
                {marcasDisponibles.map((marca, i) => <option key={i} value={marca}>{marca}</option>)}
              </select>

              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="flex-1 sm:flex-none p-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los colores</option>
                {coloresDisponibles.map((color, i) => <option key={i} value={color}>{color}</option>)}
              </select>

              {(selectedMarca || selectedColor) && (
                <button
                  onClick={() => { setSelectedMarca(""); setSelectedColor(""); }}
                  className="p-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full sm:w-auto cursor-pointer"
                >
                  Borrar filtros
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Encabezado exclusivo para impresión */}
        <div className="hidden print:block pb-3 border-b-2 border-black mb-4">
          <h1 className="text-xl font-bold text-black">Reporte General de Inventario</h1>
          <p className="text-xs text-black">Fecha de emisión: {new Date().toLocaleDateString()}</p>
        </div>

        {/* --- VISTA PARA MÓVILES (Tarjetas) --- */}
        <div className="block md:hidden space-y-3 print:hidden">
          {itemsFiltrados.length > 0 ? (
            itemsFiltrados.map((item) => {
              const itemId = item._id || item.id;
              const isEditing = isAdmin && editingId === itemId;
              const pares = Number(item.pares) || 0;

              return (
                <div key={itemId} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-20 h-20 flex-shrink-0">
                      {item.imagen ? (
                        <img 
                          src={item.imagen} 
                          alt={`Estilo ${item.estilo}`} 
                          className="w-full h-full rounded-lg object-cover border border-gray-200 shadow-sm"
                          onClick={() => window.open(item.imagen, "_blank")}
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center text-[11px] text-gray-400 italic">
                          Sin foto
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input 
                            type="text" name="estilo" value={editFormData.estilo} onChange={handleEditChange} placeholder="Estilo"
                            className="w-full p-1 border border-blue-400 rounded text-xs font-bold"
                          />
                          <input 
                            type="text" name="color" value={editFormData.color} onChange={handleEditChange} placeholder="Color"
                            className="w-full p-1 border border-blue-400 rounded text-xs"
                          />
                          <input 
                            type="text" name="marca" value={editFormData.marca} onChange={handleEditChange} placeholder="Marca"
                            className="w-full p-1 border border-blue-400 rounded text-xs uppercase"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="font-bold text-gray-900 text-sm truncate">{item.estilo}</h3>
                            <span className={`font-bold uppercase tracking-wide px-2 py-0.5 rounded text-[10px] flex-shrink-0 border ${getMarcaEstilo(item.marca)}`}>
                              {item.marca}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate"><span className="font-semibold text-gray-500">Color:</span> {item.color}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 font-medium">Pares:</span>
                      {isEditing ? (
                        <input 
                          type="number" name="pares" value={editFormData.pares} onChange={handleEditChange}
                          className="w-14 p-1 border border-blue-400 rounded text-center font-bold text-xs"
                        />
                      ) : (
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-xs
                          ${pares < 15 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}
                        `}>
                          {pares}
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button onClick={() => guardarEdicion(itemId)} className="bg-green-600 text-white py-1 px-2.5 rounded font-bold text-xs cursor-pointer">
                              Guardar
                            </button>
                            <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-800 py-1 px-2.5 rounded font-bold text-xs cursor-pointer">
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => iniciarEdicion(item)} className="bg-blue-100 text-blue-800 py-1 px-2.5 rounded font-bold text-xs cursor-pointer">
                              Editar
                            </button>
                            <button onClick={() => eliminarProducto(itemId)} className="bg-red-100 text-red-800 py-1 px-2.5 rounded font-bold text-xs cursor-pointer">
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white p-8 text-center rounded-xl border border-gray-200 text-gray-500 text-sm">
              No se encontraron productos con los filtros seleccionados.
            </div>
          )}
        </div>

        {/* --- VISTA PARA ESCRITORIO / IMPRESIÓN --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px] print:min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200 print:bg-gray-100 print:border-b-2 print:border-black">
                <tr>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider print:hidden">Foto</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider w-1/4 print:text-black print:text-xs">Estilo</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider w-1/4 print:text-black print:text-xs">Color</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider text-center w-1/6 print:text-black print:text-xs">Pares</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider w-1/4 print:text-black print:text-xs">Marca</th>
                  {isAdmin && <th className="py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider text-center print:hidden">Acciones</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                {itemsFiltrados.length > 0 ? (
                  itemsFiltrados.map((item) => {
                    const itemId = item._id || item.id;
                    const isEditing = isAdmin && editingId === itemId;
                    const pares = Number(item.pares) || 0;

                    return (
                      <tr key={itemId} className="hover:bg-blue-50/25 transition-colors duration-200 print:hover:bg-transparent">
                        
                        {/* Foto */}
                        <td className="py-2.5 px-4 print:hidden">
                          {item.imagen ? (
                            <img 
                              src={item.imagen} 
                              alt={`Estilo ${item.estilo}`} 
                              className="w-16 h-16 rounded-lg object-cover border border-gray-200 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => window.open(item.imagen, "_blank")}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center text-[10px] text-gray-400 italic">
                              Sin foto
                            </div>
                          )}
                        </td>

                        {/* Estilo */}
                        <td className="py-3 px-4 text-base print:text-black print:text-xs print:py-2">
                          {isEditing ? (
                            <input 
                              type="text" name="estilo" value={editFormData.estilo} onChange={handleEditChange}
                              className="w-full p-1.5 border border-blue-400 rounded-md font-bold text-gray-800 text-sm print:hidden"
                            />
                          ) : (
                            <span className="font-bold text-gray-800 print:text-black">{item.estilo}</span>
                          )}
                        </td>

                        {/* Color */}
                        <td className="py-3 px-4 text-base print:text-black print:text-xs print:py-2">
                          {isEditing ? (
                            <input 
                              type="text" name="color" value={editFormData.color} onChange={handleEditChange}
                              className="w-full p-1.5 border border-blue-400 rounded-md text-gray-700 text-sm print:hidden"
                            />
                          ) : (
                            <span className="text-gray-700 font-medium print:text-black">{item.color}</span>
                          )}
                        </td>

                        {/* Pares */}
                        <td className="py-3 px-4 text-center text-base print:text-black print:text-xs print:py-2">
                          {isEditing ? (
                            <input 
                              type="number" name="pares" value={editFormData.pares} onChange={handleEditChange}
                              className="w-16 p-1.5 border border-blue-400 rounded-md text-center font-bold text-sm print:hidden"
                            />
                          ) : (
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full font-bold text-sm
                              ${pares < 15 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}
                              print:bg-transparent print:text-black print:p-0
                            `}>
                              {pares}
                            </span>
                          )}
                        </td>

                        {/* Marca con colores condicionales */}
                        <td className="py-3 px-4 text-base print:text-xs print:py-2">
                          {isEditing ? (
                            <input 
                              type="text" name="marca" value={editFormData.marca} onChange={handleEditChange}
                              className="w-full p-1.5 border border-blue-400 rounded-md text-gray-700 uppercase text-sm print:hidden"
                            />
                          ) : (
                            <span className={`font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border text-sm print:bg-transparent print:border-none print:p-0 ${getMarcaEstilo(item.marca)}`}>
                              {item.marca}
                            </span>
                          )}
                        </td>

                        {/* Acciones Admin */}
                        {isAdmin && (
                          <td className="py-3 px-4 text-center print:hidden">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={() => guardarEdicion(itemId)} className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded-md font-bold text-xs transition cursor-pointer">
                                    Guardar
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1.5 px-3 rounded-md font-bold text-xs transition cursor-pointer">
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => iniciarEdicion(item)} className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-1.5 px-3 rounded-md font-bold text-xs transition cursor-pointer">
                                    Editar
                                  </button>
                                  <button onClick={() => eliminarProducto(itemId)} className="bg-red-100 hover:bg-red-200 text-red-800 py-1.5 px-3 rounded-md font-bold text-xs transition cursor-pointer">
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}

                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? "6" : "5"} className="py-12 text-center text-gray-500 text-lg">
                      No se encontraron productos con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botón de impresión hasta abajo (Visible solo para administradores) */}
        {isAdmin && (
          <div className="pt-2 flex justify-end print:hidden">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              🖨️ Imprimir
            </button>
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}
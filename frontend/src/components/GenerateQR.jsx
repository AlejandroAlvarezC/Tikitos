import { useState, useEffect, useCallback, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { API_URL } from "../config";

export default function GenerateQR() {
  const [subTab, setSubTab] = useState("individual");

  // Estados Individuales
  const [formData, setFormData] = useState({ qrCode: "", estilo: "", color: "", marca: "", imagen: "" });
  const [hojas, setHojas] = useState(1);
  const [modelosGuardados, setModelosGuardados] = useState([]);

  // Estados Media Docena
  const [mediaFormData, setMediaFormData] = useState({
    qrCode: "", estilo: "", color: "", marca: "", tallas: { "10": 2, "11": 2, "12": 2 }, imagen: ""
  });
  const [hojasMedia, setHojasMedia] = useState(1);
  const [modelosMediaGuardados, setModelosMediaGuardados] = useState([]);
  
  // 🌟 Estado para controlar si estamos editando una plantilla existente (PUT)
  const [editingId, setEditingId] = useState(null);

  // 🌟 Estados para el Modal de Impresión de Media Docena (Almacena { [id]: cantidad })
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedMediaForPrint, setSelectedMediaForPrint] = useState({});

  // 🌟 Estados de búsqueda y filtros dentro del Modal de Impresión
  const [busquedaPrint, setBusquedaPrint] = useState("");
  const [filtroMarcaPrint, setFiltroMarcaPrint] = useState("");
  const [filtroEstiloPrint, setFiltroEstiloPrint] = useState("");
  const [filtroColorPrint, setFiltroColorPrint] = useState("");

  // 🌟 Cargar plantillas desde el Backend
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/qr-templates`);
      if (!res.ok) throw new Error("Error al cargar plantillas");
      const data = await res.json();
      
      const individualList = data.filter(t => t.tipo === "individual");
      const mediaList = data.filter(t => t.tipo === "media");

      setModelosGuardados(individualList);
      setModelosMediaGuardados(mediaList);

      // Limpiamos selección al recargar plantillas
      setSelectedMediaForPrint({});

    } catch (err) {
      console.error("Error al obtener plantillas:", err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 🌟 Opciones únicas y ordenadas para los filtros del modal de impresión
  const marcasPrint = useMemo(() => {
    const mapa = new Map();
    modelosMediaGuardados.forEach((m) => {
      const texto = String(m.marca || "").trim();
      if (texto && !mapa.has(texto.toLowerCase())) {
        mapa.set(texto.toLowerCase(), texto.toUpperCase());
      }
    });
    return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [modelosMediaGuardados]);

  const estilosPrint = useMemo(() => {
    const base = filtroMarcaPrint
      ? modelosMediaGuardados.filter(
          (m) => String(m.marca || "").trim().toLowerCase() === filtroMarcaPrint.toLowerCase()
        )
      : modelosMediaGuardados;

    const unicos = [...new Set(base.map((m) => String(m.estilo || "").trim()).filter(Boolean))];
    return unicos.sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [modelosMediaGuardados, filtroMarcaPrint]);

  const coloresPrint = useMemo(() => {
    const base = modelosMediaGuardados.filter((m) => {
      const okMarca =
        !filtroMarcaPrint ||
        String(m.marca || "").trim().toLowerCase() === filtroMarcaPrint.toLowerCase();
      const okEstilo =
        !filtroEstiloPrint ||
        String(m.estilo || "").trim().toLowerCase() === filtroEstiloPrint.toLowerCase();
      return okMarca && okEstilo;
    });

    const mapa = new Map();
    base.forEach((m) => {
      const texto = String(m.color || "").trim();
      if (texto && !mapa.has(texto.toLowerCase())) {
        mapa.set(texto.toLowerCase(), texto);
      }
    });
    return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [modelosMediaGuardados, filtroMarcaPrint, filtroEstiloPrint]);

  // 🌟 Lista final filtrada para mostrar en el modal
  const modelosMediaFiltrados = useMemo(() => {
    const termino = busquedaPrint.trim().toLowerCase();

    return modelosMediaGuardados.filter((m) => {
      const marca = String(m.marca || "").trim().toLowerCase();
      const estilo = String(m.estilo || "").trim().toLowerCase();
      const color = String(m.color || "").trim().toLowerCase();
      const qrCode = String(m.qrCode || "").trim().toLowerCase();

      const okMarca = !filtroMarcaPrint || marca === filtroMarcaPrint.toLowerCase();
      const okEstilo = !filtroEstiloPrint || estilo === filtroEstiloPrint.toLowerCase();
      const okColor = !filtroColorPrint || color === filtroColorPrint.toLowerCase();
      const okBusqueda =
        !termino ||
        marca.includes(termino) ||
        estilo.includes(termino) ||
        color.includes(termino) ||
        qrCode.includes(termino);

      return okMarca && okEstilo && okColor && okBusqueda;
    });
  }, [modelosMediaGuardados, busquedaPrint, filtroMarcaPrint, filtroEstiloPrint, filtroColorPrint]);

  const hayFiltrosPrintActivos = Boolean(
    busquedaPrint || filtroMarcaPrint || filtroEstiloPrint || filtroColorPrint
  );

  const limpiarFiltrosPrint = () => {
    setBusquedaPrint("");
    setFiltroMarcaPrint("");
    setFiltroEstiloPrint("");
    setFiltroColorPrint("");
  };

  const qrDataJSON = JSON.stringify({
    qrCode: formData.qrCode, estilo: formData.estilo, color: formData.color, marca: formData.marca, pares: 1
  });

  const getMediaQrDataJSON = (m) => JSON.stringify({
    qrCode: m.qrCode, estilo: m.estilo, color: m.color, marca: m.marca, pares: 6, tallas: m.tallas
  });

  const mediaQrDataJSON = JSON.stringify({
    qrCode: mediaFormData.qrCode, estilo: mediaFormData.estilo, color: mediaFormData.color, marca: mediaFormData.marca, pares: 6, tallas: mediaFormData.tallas
  });

  const handleAutoGenerateId = (tipo) => {
    if (tipo === "individual") {
      if (!formData.marca || !formData.estilo || !formData.color) return;
      const cleanMarca = formData.marca.toUpperCase().replace(/\s+/g, "");
      const cleanEstilo = formData.estilo.toUpperCase().replace(/\s+/g, "");
      const cleanColor = formData.color.toUpperCase().split("-")[0].trim();
      const randomNum = Math.floor(100 + Math.random() * 900);
      setFormData(prev => ({ ...prev, qrCode: `${cleanMarca}-${cleanEstilo}-${cleanColor}-${randomNum}` }));
    } else {
      if (!mediaFormData.marca || !mediaFormData.estilo || !mediaFormData.color) return;
      const cleanMarca = mediaFormData.marca.toUpperCase().replace(/\s+/g, "");
      const cleanEstilo = mediaFormData.estilo.toUpperCase().replace(/\s+/g, "");
      const cleanColor = mediaFormData.color.toUpperCase().split("-")[0].trim();
      const randomNum = Math.floor(100 + Math.random() * 900);
      setMediaFormData(prev => ({ ...prev, qrCode: `MEDIA-${cleanMarca}-${cleanEstilo}-${cleanColor}-${randomNum}` }));
    }
  };

  const handleImageChange = (e, tipo) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (tipo === "individual") {
          setFormData(prev => ({ ...prev, imagen: reader.result }));
        } else {
          setMediaFormData(prev => ({ ...prev, imagen: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGuardarModelo = async (tipo) => {
    const dataActual = tipo === "individual" ? formData : mediaFormData;
    const nombrePlantilla = dataActual.nombre || `${dataActual.marca} - ${dataActual.estilo} (${dataActual.color})`.trim();

    const payload = tipo === "individual" 
      ? { ...formData, nombre: nombrePlantilla, tipo: "individual" } 
      : { ...mediaFormData, nombre: nombrePlantilla, tipo: "media" };

    if (!payload.qrCode || !payload.marca) {
      alert("Asigna una Marca y un Código Único antes de guardar.");
      return;
    }

    try {
      const url = editingId 
        ? `${API_URL}/api/qr-templates/${editingId}` 
        : `${API_URL}/api/qr-templates`;
        
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || "Error al guardar");
      }

      await fetchTemplates();

      setEditingId(null);
      if (tipo === "individual") {
        setFormData({ qrCode: "", estilo: "", color: "", marca: "", imagen: "" });
      } else {
        setMediaFormData({ qrCode: "", estilo: "", color: "", marca: "", tallas: { "10": 2, "11": 2, "12": 2 }, imagen: "" });
      }
      
      alert(editingId ? "¡Plantilla actualizada con éxito!" : "¡Plantilla y foto guardadas con éxito en el servidor!");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEliminarModelo = async (id, e) => {
    e.stopPropagation();
    const confirmar = window.confirm("¿Estás seguro de eliminar esta plantilla?");
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/api/qr-templates/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Error al eliminar");
      await fetchTemplates();
    } catch (err) {
      alert("No se pudo eliminar la plantilla");
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const EtiquetaIndividual = ({ isPrint = false }) => (
    <div
      className={`bg-white border border-gray-300 rounded-lg text-center flex flex-col items-center justify-center overflow-hidden ${
        isPrint ? "w-full h-full p-1.5" : "p-2 shadow-sm"
      }`}
    >
      <h3 className={`font-extrabold text-gray-900 uppercase tracking-wide m-0 truncate w-full leading-tight ${isPrint ? "text-[13px]" : "text-sm"}`}>
        {formData.marca || "MARCA"}
      </h3>
      <div className="my-1 p-0.5 bg-white rounded border border-gray-100 flex items-center justify-center">
        <QRCodeSVG value={formData.qrCode ? qrDataJSON : "vacio"} size={isPrint ? 96 : 90} level="M" />
      </div>
      <div className={`text-gray-800 space-y-0.5 font-medium leading-tight w-full ${isPrint ? "text-[10px]" : "text-[10px]"}`}>
        <p className="truncate">
          <span className="font-bold">Est:</span> {formData.estilo || "—"} | <span className="font-bold">Col:</span> {formData.color || "—"}
        </p>
        <p className="font-mono text-[7.5px] text-gray-500 truncate">{formData.qrCode || "—"}</p>
      </div>
    </div>
  );

  const EtiquetaMedia = () => (
    <div className="bg-white p-2 border border-purple-300 rounded-lg shadow-sm text-center flex flex-col items-center justify-center relative">
      <span className="absolute top-1 right-1 bg-purple-100 text-purple-800 text-[8px] font-bold px-1.5 py-0.5 rounded">
        6 Pares
      </span>
      <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wide m-0">
        {mediaFormData.marca || "MARCA"}
      </h3>
      <div className="my-1 p-1 bg-white rounded border border-gray-100">
        <QRCodeSVG value={mediaFormData.qrCode ? mediaQrDataJSON : "vacio"} size={80} level="M" />
      </div>
      <div className="text-[9px] text-gray-700 space-y-0.5 font-medium leading-tight w-full">
        <p><span className="font-bold">Est:</span> {mediaFormData.estilo || "—"} | <span className="font-bold">Col:</span> {mediaFormData.color || "—"}</p>
        
        <div className="flex justify-center gap-1.5 bg-purple-50 text-purple-900 px-1 py-0.5 rounded my-0.5 text-[8px] font-bold">
          <span>T10: {mediaFormData.tallas["10"] || 0}</span>
          <span>T11: {mediaFormData.tallas["11"] || 0}</span>
          <span>T12: {mediaFormData.tallas["12"] || 0}</span>
        </div>

        <p className="font-mono text-[7px] text-gray-400 truncate">{mediaFormData.qrCode || "—"}</p>
      </div>
    </div>
  );

  // 🌟 Etiqueta de impresión optimizada para llenar cada celda de la cuadrícula 4x5 (20 por hoja)
  const EtiquetaMediaModalItem = ({ m }) => (
    <div className="w-full h-full bg-white px-2 py-1.5 border border-purple-300 rounded-lg text-center flex flex-col items-center justify-between relative overflow-hidden">
      <span className="absolute top-1 right-1.5 bg-purple-100 text-purple-800 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none">
        6P
      </span>

      <h3 className="font-extrabold text-[13px] text-gray-900 uppercase tracking-wide m-0 truncate w-full pr-6 leading-tight">
        {m.marca || "MARCA"}
      </h3>

      <div className="my-0.5 p-0.5 bg-white rounded border border-gray-200 flex items-center justify-center">
        <QRCodeSVG value={m.qrCode ? getMediaQrDataJSON(m) : "vacio"} size={104} level="M" />
      </div>

      <div className="text-[10px] text-gray-800 space-y-0.5 font-semibold leading-tight w-full">
        <p className="truncate">
          <span className="font-bold text-gray-500">Est:</span> {m.estilo || "—"} | <span className="font-bold text-gray-500">Col:</span> {m.color || "—"}
        </p>
        
        <div className="flex justify-center gap-2 bg-purple-50 text-purple-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-purple-100">
          <span>10:{m.tallas?.["10"] || 0}</span>
          <span>11:{m.tallas?.["11"] || 0}</span>
          <span>12:{m.tallas?.["12"] || 0}</span>
        </div>

        <p className="font-mono text-[7.5px] text-gray-500 truncate">{m.qrCode || "—"}</p>
      </div>
    </div>
  );

  const seleccionadosMedia = modelosMediaGuardados.flatMap(m => {
    const id = m._id || m.id;
    const cantidad = selectedMediaForPrint[id];
    if (!cantidad || cantidad <= 0) return [];
    return Array.from({ length: cantidad }, () => m);
  });

  // 🌟 20 etiquetas por hoja (4 columnas x 5 filas a hoja completa)
  const ETIQUETAS_POR_HOJA_MEDIA = 20;
  const paginasMedia = [];
  for (let i = 0; i < seleccionadosMedia.length; i += ETIQUETAS_POR_HOJA_MEDIA) {
    paginasMedia.push(seleccionadosMedia.slice(i, i + ETIQUETAS_POR_HOJA_MEDIA));
  }

  const totalEtiquetasSeleccionadas = Object.values(selectedMediaForPrint).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6 print:p-0 print:shadow-none print:m-0 print:bg-transparent">

      {/* 🌟 Estilos dedicados de impresión a hoja Carta completa sin márgenes desperdiciados */}
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .tikitos-print-sheet-media {
            width: 100% !important;
            height: 276mm !important;
            padding: 5mm !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            grid-template-rows: repeat(5, minmax(0, 1fr)) !important;
            gap: 2.5mm !important;
            page-break-after: always;
            break-after: page;
            overflow: hidden !important;
          }
          .tikitos-print-sheet-ind {
            width: 100% !important;
            height: 276mm !important;
            padding: 5mm !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            grid-template-rows: repeat(6, minmax(0, 1fr)) !important;
            gap: 2mm !important;
            page-break-after: always;
            break-after: page;
            overflow: hidden !important;
          }
          .tikitos-print-sheet-media:last-child,
          .tikitos-print-sheet-ind:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>
      
      <div className="print:hidden">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-blue-900">🖨️ Generador de Planillas QR</h2>
            <p className="text-xs text-gray-500 mt-0.5">Plantillas sincronizadas en la base de datos.</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setSubTab("individual")}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                subTab === "individual" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-blue-600"
              }`}
            >
              🏷️ Individuales (1 Par)
            </button>
            <button
              onClick={() => setSubTab("media")}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                subTab === "media" ? "bg-purple-600 text-white shadow-sm" : "text-gray-600 hover:text-purple-600"
              }`}
            >
              📦 Media Docena (6 Pares)
            </button>
          </div>
        </div>

        {/* PESTAÑA INDIVIDUAL */}
        {subTab === "individual" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 text-sm">
                {editingId ? "✏️ Editando Plantilla Individual" : "Configuración - Individual"}
              </h3>
              <button 
                onClick={() => {
                  setFormData({ qrCode: "", estilo: "", color: "", marca: "", imagen: "" });
                  setEditingId(null);
                }}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium cursor-pointer"
              >
                ✨ Limpiar Formulario
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca:</label>
                  <input
                    type="text" className="w-full p-2 border border-blue-200 rounded text-sm"
                    value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estilo:</label>
                    <input
                      type="text" className="w-full p-2 border border-blue-200 rounded text-sm"
                      value={formData.estilo} onChange={(e) => setFormData({ ...formData, estilo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color:</label>
                    <input
                      type="text" className="w-full p-2 border border-blue-200 rounded text-sm"
                      value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Foto del Producto:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, "individual")}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-blue-200 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Código Único ID:</label>
                    <button type="button" onClick={() => handleAutoGenerateId("individual")} className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer">
                      ⚡ Generar Sugerido
                    </button>
                  </div>
                  <input
                    type="text" className="w-full p-2 border border-blue-200 rounded bg-gray-50 font-mono text-sm"
                    value={formData.qrCode} onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                  />
                </div>
                <button
                  onClick={() => handleGuardarModelo("individual")}
                  className={`w-full font-bold py-2 px-4 rounded-lg border transition text-sm cursor-pointer ${
                    editingId ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300" : "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                  }`}
                >
                  {editingId ? "💾 Actualizar Plantilla en Servidor" : "💾 Guardar Plantilla en Servidor"}
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50">
                <p className="text-xs font-medium text-blue-800 mb-3">Vista previa:</p>
                <div className="w-48"><EtiquetaIndividual /></div>
                
                {formData.imagen && (
                  <div className="mt-3 w-16 h-16 rounded-lg overflow-hidden border border-blue-300 shadow-sm">
                    <img src={formData.imagen} alt="Vista previa" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="mt-4 w-full max-w-xs space-y-2">
                  <input
                    type="number" min="1" max="50"
                    className="w-full p-1.5 border-2 border-blue-400 rounded bg-white text-center font-bold text-sm"
                    value={hojas} onChange={(e) => setHojas(Number(e.target.value))}
                  />
                  <button
                    onClick={handlePrint}
                    className={`w-full font-bold py-2.5 px-4 rounded-lg shadow transition text-sm flex items-center justify-center gap-2 ${
                      formData.qrCode ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    🖨️ Imprimir {hojas} Hoja{hojas > 1 ? "s" : ""} ({hojas * 24} QRs)
                  </button>
                </div>
              </div>
            </div>

            {/* Listado plantillas individuales */}
            <div className="mt-8 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">📂 Modelos Individuales en Nube ({modelosGuardados.length})</h4>
              {modelosGuardados.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay plantillas individuales guardadas.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {modelosGuardados.map((m) => {
                    const id = m._id || m.id;
                    return (
                      <div 
                        key={id}
                        onClick={() => {
                          setFormData(m);
                          setEditingId(id);
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer transition relative group ${
                          editingId === id ? "border-amber-500 bg-amber-50 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <button onClick={(e) => handleEliminarModelo(id, e)} className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 text-xs">✖</button>
                        <p className="font-bold text-xs uppercase">{m.marca}</p>
                        <p className="text-[10px] text-gray-600">Est: {m.estilo} | Col: {m.color}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA MEDIA DOCENA */}
        {subTab === "media" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-purple-900 text-sm">
                {editingId ? "✏️ Editando Plantilla Media Docena" : "Configuración - Media Docena (6 Pares con Tallas)"}
              </h3>
              <button 
                onClick={() => {
                  setMediaFormData({ qrCode: "", estilo: "", color: "", marca: "", tallas: { "10": 2, "11": 2, "12": 2 }, imagen: "" });
                  setEditingId(null);
                }}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium cursor-pointer"
              >
                ✨ Limpiar Formulario
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca:</label>
                  <input
                    type="text" className="w-full p-2 border border-purple-200 rounded text-sm"
                    value={mediaFormData.marca} onChange={(e) => setMediaFormData({ ...mediaFormData, marca: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estilo:</label>
                    <input
                      type="text" className="w-full p-2 border border-purple-200 rounded text-sm"
                      value={mediaFormData.estilo} onChange={(e) => setMediaFormData({ ...mediaFormData, estilo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color:</label>
                    <input
                      type="text" className="w-full p-2 border border-purple-200 rounded text-sm"
                      value={mediaFormData.color} onChange={(e) => setMediaFormData({ ...mediaFormData, color: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Foto del Producto:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, "media")}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border border-purple-200 rounded cursor-pointer"
                  />
                </div>

                <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100">
                  <label className="block text-xs font-bold text-purple-900 mb-2">Distribución de Tallas:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-600 mb-1 font-semibold">Talla 10:</span>
                      <input
                        type="number" className="w-full p-1.5 border border-purple-200 rounded text-center text-sm font-bold bg-white"
                        value={mediaFormData.tallas["10"]} onChange={(e) => setMediaFormData({ ...mediaFormData, tallas: { ...mediaFormData.tallas, "10": Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-600 mb-1 font-semibold">Talla 11:</span>
                      <input
                        type="number" className="w-full p-1.5 border border-purple-200 rounded text-center text-sm font-bold bg-white"
                        value={mediaFormData.tallas["11"]} onChange={(e) => setMediaFormData({ ...mediaFormData, tallas: { ...mediaFormData.tallas, "11": Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-600 mb-1 font-semibold">Talla 12:</span>
                      <input
                        type="number" className="w-full p-1.5 border border-purple-200 rounded text-center text-sm font-bold bg-white"
                        value={mediaFormData.tallas["12"]} onChange={(e) => setMediaFormData({ ...mediaFormData, tallas: { ...mediaFormData.tallas, "12": Number(e.target.value) } })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Código Único ID:</label>
                    <button type="button" onClick={() => handleAutoGenerateId("media")} className="text-xs text-purple-600 hover:underline font-semibold cursor-pointer">
                      ⚡ Generar Sugerido
                    </button>
                  </div>
                  <input
                    type="text" className="w-full p-2 border border-purple-200 rounded bg-gray-50 font-mono text-sm"
                    value={mediaFormData.qrCode} onChange={(e) => setMediaFormData({ ...mediaFormData, qrCode: e.target.value })}
                  />
                </div>

                <button
                  onClick={() => handleGuardarModelo("media")}
                  className={`w-full font-bold py-2 px-4 rounded-lg border transition text-sm cursor-pointer ${
                    editingId ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300" : "bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300"
                  }`}
                >
                  {editingId ? "💾 Actualizar Plantilla en Servidor" : "💾 Guardar Plantilla en Servidor"}
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/30">
                <p className="text-xs font-medium text-purple-900 mb-3">Vista previa (Media Docena):</p>
                <div className="w-48"><EtiquetaMedia /></div>

                {mediaFormData.imagen && (
                  <div className="mt-3 w-16 h-16 rounded-lg overflow-hidden border border-purple-300 shadow-sm">
                    <img src={mediaFormData.imagen} alt="Vista previa" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="mt-4 w-full max-w-xs space-y-2">
                  <input
                    type="number" min="1" max="50"
                    className="w-full p-1.5 border-2 border-purple-400 rounded bg-white text-center font-bold text-sm"
                    value={hojasMedia} onChange={(e) => setHojasMedia(Number(e.target.value))}
                  />

                  <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="w-full font-bold py-2.5 px-4 rounded-lg shadow transition text-sm flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    🖨️ Imprimir
                  </button>
                </div>
              </div>
            </div>

            {/* Listado plantillas media docena */}
            <div className="mt-8 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">📂 Modelos Media Docena en Nube ({modelosMediaGuardados.length})</h4>
              {modelosMediaGuardados.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay plantillas de media docena guardadas.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {modelosMediaGuardados.map((m) => {
                    const id = m._id || m.id;
                    return (
                      <div 
                        key={id}
                        onClick={() => {
                          setMediaFormData(m);
                          setEditingId(id);
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer transition relative group ${
                          editingId === id ? "border-amber-500 bg-amber-50 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <button onClick={(e) => handleEliminarModelo(id, e)} className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 text-xs">✖</button>
                        <p className="font-bold text-xs uppercase">{m.marca}</p>
                        <p className="text-[10px] text-gray-600">Est: {m.estilo} | Col: {m.color}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* 🌟 VENTANA EMERGENTE (MODAL) CON BUSCADOR Y FILTROS POR MARCA, ESTILO Y COLOR */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-purple-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">🖨️ Seleccionar Plantillas (Media Docena)</h3>
                <p className="text-xs text-purple-200">Elige cuántas etiquetas de cada plantilla deseas imprimir (20 por hoja).</p>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="text-white hover:bg-purple-800 p-1.5 rounded-lg font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 🔍 Barra de búsqueda y filtros en cascada */}
            <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2">
              <input
                type="text"
                value={busquedaPrint}
                onChange={(e) => setBusquedaPrint(e.target.value)}
                placeholder="🔍 Buscar por marca, estilo, color o código QR..."
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={filtroMarcaPrint}
                  onChange={(e) => {
                    setFiltroMarcaPrint(e.target.value);
                    setFiltroEstiloPrint("");
                    setFiltroColorPrint("");
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="">Todas las marcas</option>
                  {marcasPrint.map((marca) => (
                    <option key={marca} value={marca}>{marca}</option>
                  ))}
                </select>

                <select
                  value={filtroEstiloPrint}
                  onChange={(e) => {
                    setFiltroEstiloPrint(e.target.value);
                    setFiltroColorPrint("");
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="">Todos los estilos</option>
                  {estilosPrint.map((estilo) => (
                    <option key={estilo} value={estilo}>Est: {estilo}</option>
                  ))}
                </select>

                <select
                  value={filtroColorPrint}
                  onChange={(e) => setFiltroColorPrint(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="">Todos los colores</option>
                  {coloresPrint.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              {hayFiltrosPrintActivos && (
                <div className="flex items-center justify-between text-[11px] text-gray-600 pt-0.5">
                  <span>
                    Mostrando <strong className="text-purple-800">{modelosMediaFiltrados.length}</strong> de {modelosMediaGuardados.length} plantillas
                  </span>
                  <button
                    type="button"
                    onClick={limpiarFiltrosPrint}
                    className="text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    ✕ Limpiar filtros
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 overflow-y-auto flex-grow space-y-2">
              {modelosMediaGuardados.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay modelos de media docena guardados en la nube.</p>
              ) : modelosMediaFiltrados.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm text-gray-500">No se encontraron plantillas con esos filtros.</p>
                  <button
                    type="button"
                    onClick={limpiarFiltrosPrint}
                    className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    Ver todas las plantillas
                  </button>
                </div>
              ) : (
                modelosMediaFiltrados.map((m) => {
                  const id = m._id || m.id;
                  const cantidadActual = selectedMediaForPrint[id];
                  const isChecked = cantidadActual !== undefined && cantidadActual > 0;

                  return (
                    <div 
                      key={id} 
                      className={`flex items-center justify-between p-3 border rounded-xl transition ${
                        isChecked ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedMediaForPrint(prev => {
                              const copia = { ...prev };
                              if (e.target.checked) {
                                copia[id] = 1;
                              } else {
                                delete copia[id];
                              }
                              return copia;
                            });
                          }}
                          className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-sm text-gray-800 uppercase">{m.marca}</p>
                          <p className="text-xs text-gray-600">Est: {m.estilo} | Col: {m.color}</p>
                          <p className="font-mono text-[10px] text-gray-400">{m.qrCode}</p>
                        </div>
                      </div>

                      <div>
                        {isChecked ? (
                          <select
                            value={cantidadActual}
                            onChange={(e) => {
                              const nuevaCantidad = parseInt(e.target.value) || 1;
                              setSelectedMediaForPrint(prev => ({
                                ...prev,
                                [id]: nuevaCantidad
                              }));
                            }}
                            className="text-xs font-semibold text-purple-700 bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5, 6, 10, 12, 18, 20, 24, 30, 40, 60].map((num) => (
                              <option key={num} value={num}>
                                {num} {num === 1 ? 'Unidad' : 'Unidades'}{num === 20 ? ' ⭐ (1 Hoja)' : num === 40 ? ' ⭐ (2 Hojas)' : num === 60 ? ' ⭐ (3 Hojas)' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                            1 Unidad
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700">
                Total etiquetas a imprimir: <span className="text-purple-700">{totalEtiquetasSeleccionadas}</span> ({paginasMedia.length} {paginasMedia.length === 1 ? 'hoja' : 'hojas'})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setIsPrintModalOpen(false);
                    setTimeout(() => window.print(), 300);
                  }}
                  disabled={paginasMedia.length === 0}
                  className={`px-4 py-2 font-bold rounded-lg text-xs transition shadow flex items-center gap-2 ${
                    paginasMedia.length > 0 ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  🖨️ Imprimir Selección
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZONA DE IMPRESIÓN OCULTA (SE MUESTRA AL LLAMAR A window.print()) */}
      <div className="hidden print:block">
        {subTab === "individual" ? (
          Array.from({ length: hojas }).map((_, hojaIndex) => (
            <div key={hojaIndex} className="tikitos-print-sheet-ind">
              {Array.from({ length: 24 }).map((_, i) => (
                <EtiquetaIndividual key={i} isPrint />
              ))}
            </div>
          ))
        ) : (
          paginasMedia.map((paginaItems, hojaIndex) => (
            <div key={hojaIndex} className="tikitos-print-sheet-media">
              {paginaItems.map((m, i) => (
                <EtiquetaMediaModalItem key={i} m={m} />
              ))}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
import { Scanner } from '@yudiel/react-qr-scanner';

// 🌟 NUEVO: Ahora recibe instrucciones (props) desde App.jsx
const LectorQR = ({ onScanSuccess, codigoActual }) => {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>Escanear Artículo</h2>
      
      <div style={{ width: '300px', margin: '0 auto' }}>
        <Scanner 
          onScan={(resultado) => {
            // 🌟 1. Imprimimos literalmente lo que arroja el escáner
            console.log("🔍 ESCÁNER DETECTÓ ALGO:", resultado); 

            // 🌟 2. Hacemos la validación de forma más segura
            if (resultado) {
              // Dependiendo de la versión de la librería, a veces es un arreglo y a veces es un string directo.
              const codigoExtraido = Array.isArray(resultado) ? resultado[0].rawValue : resultado;
              
              console.log("✅ CÓDIGO EXTRAÍDO:", codigoExtraido);
              onScanSuccess(codigoExtraido);
            }
          }} 
          onError={(error) => {
            // Solo imprimimos errores reales, no los avisos constantes de "buscando"
            if (error && error.message && !error.message.includes('No MultiFormat Readers')) {
              console.error("❌ Error del escáner:", error);
            }
          }}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Código detectado:</h3>
        {codigoActual ? (
          <p style={{ color: 'green', fontWeight: 'bold', fontSize: '20px' }}>
            {codigoActual}
          </p>
        ) : (
          <p>Esperando código...</p>
        )}
      </div>
    </div>
  );
};

export default LectorQR;
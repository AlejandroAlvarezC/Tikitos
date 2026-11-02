// src/components/Navbar.jsx
import React, { useState } from 'react';

export default function Navbar({ isAdmin, setIsAdmin }) {
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setIsAdmin(true);
      setShowModal(false);
      setUsername('');
      setPassword('');
      setError('');
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end shadow-sm sticky top-0 z-40 print:hidden">
        <div>
          {isAdmin ? (
            <button
              onClick={() => setIsAdmin(false)}
              className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 transition cursor-pointer"
            >
              Cerrar Sesión
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs bg-blue-600 text-white px-3.5 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm cursor-pointer"
            >
              Acceder
            </button>
          )}
        </div>
      </header>

      {/* Ventana Modal de Inicio de Sesión */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-800">Panel de Administración</h3>
              <button 
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. admin"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 font-medium text-center">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                >
                  Cancelar+
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
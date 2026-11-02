// 1. Cambiamos require por import
import jwt from "jsonwebtoken";

// 2. Exportar directamente cada función
// Middleware: verificar token
export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "No autorizado, token faltante" });
  }

  try {
    // Nota: Asegúrate de que JWT_SECRET esté cargado en tu server.js con dotenv
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
};

// 3. También exportamos isAdmin directamente
// Middleware: verificar rol admin
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role !== "admin") {
    return res.status(403).json({ message: "Acceso denegado" });
  }
  next();
};

// IMPORTANTE: Borramos el module.exports que estaba al final
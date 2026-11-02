// 1. Solo debe haber UN import para esto arriba del todo:
import express from "express";
import { getInventory } from "../controllers/productController.js"; // <-- Este se queda
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 2. BORRA la línea que decía: 
// const { getInventory } = require("../controllers/productController"); <-- ESTA FUERA

// 3. El resto de tus rutas...
router.get("/inventario", protect, getInventory);

export default router;


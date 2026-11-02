const express = require("express");
const router = express.Router();
const {
  addByQR,
  getInventory
} = require("../controllers/productController");

const {
  protect,
  isAdmin
} = require("../middleware/authMiddleware");

router.post("/add", protect, isAdmin, addByQR);
router.get("/", protect, getInventory);

module.exports = router;

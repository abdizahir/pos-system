import { Router } from "express";
import {createProduct, deleteProduct, getProduct, getProducts, updateProduct} from "../controllers/product.controller.js";
import { getProductAlerts } from "../controllers/productAlerts.controller.js";

const router = Router();

router.get("/", getProducts);
// Before "/:id"
router.get("/alerts", getProductAlerts);
router.get("/:id", getProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);


export default router;

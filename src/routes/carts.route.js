import { Router } from "express";
import {
  addToCart,
  clearCart,
  removeFromCart,
  updateCart,
  getCart,
} from "../controllers/carts.controller.js";

const router = Router();

router.route("/").get(getCart).delete(clearCart);
router.route("/items").post(addToCart);
router.route("/items/:id").put(updateCart).delete(removeFromCart);

export default router;

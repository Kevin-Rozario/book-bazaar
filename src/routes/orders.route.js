import { Router } from "express";
import {
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
} from "../controllers/orders.controller.js";

const router = Router();

router.route("/").get(getUserOrders).post(createOrder);
router.route("/:orderId").get(getOrderById);
router.route("/:orderId/status").put(updateOrderStatus);

export default router;

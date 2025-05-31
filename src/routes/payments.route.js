import { Router } from "express";
import {
  createPayment,
  handlePayment,
  verifyPayment,
} from "../controllers/payments.controller.js";

const router = Router();

router.route("/create").post(createPayment);
router.route("/verify").post(verifyPayment);
router.route("/handle").post(handlePayment);

export default router;

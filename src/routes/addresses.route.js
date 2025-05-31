import { Router } from "express";
import {
  createAddress,
  deleteAddress,
  getUserAddresses,
  updateAddress,
} from "../controllers/address.controller.js";

const router = Router();

router.route("/").get(getUserAddresses).post(createAddress);
router.route("/:addressId").put(updateAddress).delete(deleteAddress);

export default router;

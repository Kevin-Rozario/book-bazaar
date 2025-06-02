import { Router } from "express";
import {
  forgotPassword,
  rotateApiKey,
  getProfile,
  login,
  logout,
  register,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller.js";

const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/resend-verification-email").post(resendVerificationEmail);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);
router.route("/rotate-api-key").post(rotateApiKey);
router.route("/get-profile").get(getProfile);

export default router;

import { Router } from "express";
import {
  createBook,
  deleteBookById,
  getBookById,
  getBooks,
  updateBookById,
} from "../controllers/books.controller.js";
import { adminCheck, authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(authMiddleware, adminCheck, createBook).get(getBooks);
router
  .route("/:bookId")
  .get(getBookById)
  .put(authMiddleware, adminCheck, updateBookById)
  .delete(authMiddleware, adminCheck, deleteBookById);

export default router;

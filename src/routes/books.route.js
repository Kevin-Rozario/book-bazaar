import { Router } from "express";
import {
  createBook,
  deleteBookById,
  getBookById,
  getBooks,
  updateBookById,
} from "../controllers/books.controller.js";

const router = Router();

router.route("/").post(createBook).get(getBooks);
router
  .route("/:bookId")
  .get(getBookById)
  .put(updateBookById)
  .delete(deleteBookById);

export default router;

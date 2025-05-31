import { Router } from "express";
import {
  createReview,
  deleteReviewByUserId,
  getReviewsByBookId,
} from "../controllers/reviews.controller.js";

const router = Router();

router
  .route("books/:bookId/reviews")
  .post(createReview)
  .get(getReviewsByBookId);
router.route("/:reviewId").delete(deleteReviewByUserId);

export default router;

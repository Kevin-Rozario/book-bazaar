import asyncHandler from "../utils/asyncHandler.util.js";
import ApiError from "../utils/apiError.util.js";
import ApiResponse from "../utils/apiResponse.util.js";

// create book by admin
export const createBook = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    author,
    genre,
    series,
    publisher,
    format,
    price,
    stock,
    isbn,
    imageUrl,
  } = req.body;

  if (
    !title ||
    !description ||
    !author ||
    !genre ||
    !series ||
    !publisher ||
    !format ||
    !price ||
    !stock ||
    !isbn ||
    !imageUrl
  ) {
    return res.status(400).json(new ApiError(400, "All fields are required"));
  }
});

// get all books by api key
export const getBooks = asyncHandler(async (req, res) => {});

// get book by id using api key
export const getBookById = asyncHandler(async (req, res) => {});

// update book by admin
export const updateBookById = asyncHandler(async (req, res) => {});

// delete book by admin
export const deleteBookById = asyncHandler(async (req, res) => {});

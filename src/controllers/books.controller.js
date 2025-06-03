import asyncHandler from "../utils/asyncHandler.util.js";
import ApiError from "../utils/apiError.util.js";
import ApiResponse from "../utils/apiResponse.util.js";
import db from "../config/db.config.js";

// create book by admin
export const createBook = asyncHandler(async (req, res) => {
  const { id } = req.user;
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
    !publisher ||
    !format ||
    price === undefined ||
    stock === undefined ||
    !isbn ||
    !imageUrl
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const numericPrice = Number(price);
  const numericStock = Number(stock);

  if (isNaN(numericPrice) || isNaN(numericStock)) {
    throw new ApiError(400, "Price and stock must be valid numbers");
  }

  const existingBook = await db.book.findFirst({
    where: { isbn: isbn.trim() },
  });

  if (existingBook) {
    throw new ApiError(400, "Book already exists");
  }

  const newBook = await db.book.create({
    data: {
      userId: id,
      title: title.trim(),
      description: description.trim(),
      author: author.trim().toLowerCase(),
      genre: genre.trim().toLowerCase(),
      series: series ? series.trim().toLowerCase() : undefined,
      publisher: publisher.trim().toLowerCase(),
      format,
      price: numericPrice,
      stock: numericStock,
      isbn: isbn.trim(),
      imageUrl: imageUrl.trim(),
    },
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, { message: "Book created successfully" }, newBook),
    );
});

// get all books by api key
export const getBooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1 || limit < 1) {
    throw new ApiError(400, "Page and limit must be positive integers");
  }

  const offset = (page - 1) * limit;

  const totalBooks = await db.book.count();

  const books = await db.book.findMany({
    skip: offset,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        message:
          books.length > 0
            ? "Books fetched successfully"
            : "No books available",
        page,
        limit,
        totalBooks,
        totalPages: Math.ceil(totalBooks / limit),
      },
      books,
    ),
  );
});

// get book by id using api key
export const getBookById = asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  if (!bookId) {
    throw new ApiError(400, "Book id is required");
  }

  const book = await db.book.findUnique({
    where: {
      bookId,
    },
  });

  if (!book) {
    throw new ApiError(404, "Book not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { message: "Book found successfully" }, book));
});

// update book by admin
export const updateBookById = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { bookId } = req.params;
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
    !publisher ||
    !format ||
    price === undefined ||
    stock === undefined ||
    !isbn ||
    !imageUrl
  ) {
    throw new ApiError(400, "All fields except series are required");
  }

  if (isNaN(price) || isNaN(stock)) {
    throw new ApiError(400, "Price and stock must be valid numbers");
  }

  const existingBook = await db.book.findUnique({
    where: { bookId },
  });

  if (!existingBook) {
    throw new ApiError(404, "Book not found");
  }

  const updatedBook = await db.book.update({
    where: { bookId },
    data: {
      userId: id,
      title: title.trim(),
      description: description.trim(),
      author: author.trim().toLowerCase(),
      genre: genre.trim().toLowerCase(),
      series: series ? series.trim().toLowerCase() : null,
      publisher: publisher.trim().toLowerCase(),
      format,
      price: Number(price),
      stock: Number(stock),
      isbn: isbn.trim(),
      imageUrl: imageUrl.trim(),
    },
    select: {
      bookId: true,
      title: true,
      description: true,
      author: true,
      genre: true,
      series: true,
      publisher: true,
      format: true,
      price: true,
      stock: true,
      isbn: true,
      imageUrl: true,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { message: "Book updated successfully" },
        updatedBook,
      ),
    );
});

// delete book by admin
export const deleteBookById = asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  const { bookId } = req.params;

  if (!bookId) {
    throw new ApiError(400, "Book id is required");
  }

  const existingBook = await db.book.findUnique({
    where: { bookId },
  });

  if (!existingBook) {
    throw new ApiError(404, "Book not found");
  }

  if (role !== "ADMIN" && existingBook.userId !== id) {
    throw new ApiError(403, "You do not have permission to delete this book");
  }

  await db.book.delete({
    where: { bookId },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { message: "Book deleted successfully" }));
});


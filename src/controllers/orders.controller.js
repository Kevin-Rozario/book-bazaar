import asyncHandler from "../utils/asyncHandler.util.js";
import ApiError from "../utils/apiError.util.js";
import db from "../config/db.config.js";
import ApiResponse from "../utils/apiResponse.util.js";

// create order by authorized user
export const createOrder = asyncHandler(async (req, res) => {
  const { id: userId } = req.user;
  const { bookIds, addressId } = req.body;

  if (!userId) {
    throw new ApiError(400, "User id is required");
  }
  if (!Array.isArray(bookIds) || bookIds.length === 0) {
    throw new ApiError(400, "Book ids must be a non-empty array");
  }

  if (!addressId) {
    throw new ApiError(400, "Address id is required");
  }

  const address = await db.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) {
    throw new ApiError(400, "Invalid address id");
  }

  const books = await db.book.findMany({
    where: {
      bookId: {
        in: bookIds,
      },
      stock: {
        gt: 0,
      },
      isActive: true,
    },
  });

  if (books.length !== bookIds.length) {
    throw new ApiError(400, "Some book ids are invalid or out of stock");
  }

  const totalAmount = books.reduce((sum, book) => sum + book.price, 0);
  const discountAmount = 0;
  const shippingAmount = 0;
  const taxAmount = 0;
  const finalAmount = totalAmount - discountAmount + shippingAmount + taxAmount;

  const order = await db.order.create({
    data: {
      userId,
      addressId,
      totalAmount,
      discountAmount,
      shippingAmount,
      taxAmount,
      finalAmount,
      orderItems: {
        create: books.map((book) => ({
          bookId: book.bookId,
          quantity: 1,
          unitPrice: book.price,
          totalPrice: book.price,
        })),
      },
    },
    include: {
      orderItems: true,
    },
  });

  if (!order) {
    throw new ApiError(500, "Failed to create order");
  }

  for (const book of books) {
    await db.book.update({
      where: { bookId: book.bookId },
      data: {
        stock: { decrement: 1 },
      },
    });
  }

  res
    .status(201)
    .json(
      new ApiResponse(201, { message: "Order created successfully" }, order),
    );
});

// get all orders by authorized user
export const getUserOrders = asyncHandler(async (req, res) => {});

// get order by id by authorized user
export const getOrderById = asyncHandler(async (req, res) => {});

// update order status by admin
export const updateOrderStatus = asyncHandler(async (req, res) => {});

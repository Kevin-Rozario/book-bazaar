import asyncHandler from "../utils/asyncHandler.util.js";
import ApiResponse from "../utils/apiResponse.util.js";
import ApiError from "../utils/apiError.util.js";
import db from "../config/db.config.js";
import {
  sendEmail,
  emailVerificationMailGenContent,
} from "../utils/sendEmail.js";
import { hashPassword } from "../utils/hashPassword.util.js";
import { generateTemporaryToken } from "../utils/generateToken.util.js";

// register user
export const register = asyncHandler(async (req, res) => {
  // get user data
  const { email, userName, fullName, password } = req.body;

  // validate
  if (!email || !userName || !fullName || !password) {
    return res.status(400).json(new ApiError(400, "All fields are required"));
  }

  // search for existing user
  const existingUser = await db.user.findUnique({
    where: {
      OR: [{ email }, { userName }],
    },
  });

  // check if user already exists
  if (existingUser) {
    if (existingUser.email === email) {
      return res.status(400).json(new ApiError(400, "Email already exists"));
    }
    if (existingUser.userName === userName) {
      return res.status(400).json(new ApiError(400, "Username already exists"));
    }
  }

  // generate hashed password
  const hashedPassword = await hashPassword(password);

  // create user
  const createdUser = await db.$transaction(async (prisma) => {
    const newUser = await prisma.user.create({
      data: {
        email,
        userName,
        fullName,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        userName: true,
        fullName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // set email verification token
    const { token, tokenExpiry } = generateTemporaryToken();
    await prisma.user.update({
      where: {
        id: newUser.id, // FIX: Use newUser.id here
      },
      data: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: tokenExpiry,
      },
    });
    return newUser;
  });

  // send verification email
  const mailOptions = {
    email,
    subject: "Book Bazaar - Email Verification",
    mailGenContent: emailVerificationMailGenContent({
      userName,
      verificationUrl: `${process.env.APP_URL}/verify-email/${token}`,
    }),
  };
  const emailStatus = await sendEmail(mailOptions);

  if (!emailStatus) {
    console.error("Email not sent", emailStatus);
    return res.status(400).json(new ApiError(400, "Email not sent"));
  }

  // send response
  res.status(201).json(
    new ApiResponse(
      201,
      {
        message:
          "User created successfully. Please check your email for verification.",
      },
      createdUser,
    ),
  );
});

// verify email of user
export const verifyEmail = asyncHandler(async (req, res) => {});

// resend verification email to user
export const resendVerificationEmail = asyncHandler(async (req, res) => {});

// login user
export const login = asyncHandler(async (req, res) => {});

// logout user
export const logout = asyncHandler(async (req, res) => {});

// generate api key
export const generateApiKey = asyncHandler(async (req, res) => {});

// get user profile
export const getProfile = asyncHandler(async (req, res) => {});

// forgot password
export const forgotPassword = asyncHandler(async (req, res) => {});

// reset password
export const resetPassword = asyncHandler(async (req, res) => {});

// renew refresh token
export const renewRefreshToken = asyncHandler(async (req, res) => {});

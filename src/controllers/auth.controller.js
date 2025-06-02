import asyncHandler from "../utils/asyncHandler.util.js";
import ApiResponse from "../utils/apiResponse.util.js";
import ApiError from "../utils/apiError.util.js";
import db from "../config/db.config.js";
import {
  sendEmail,
  emailVerificationMailGenContent,
} from "../utils/sendEmail.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.util.js";
import { generateTemporaryToken } from "../utils/generateToken.util.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyJwtToken,
} from "../utils/generateToken.util.js";
import { generateApiKeyString } from "../utils/generateApiKey.util.js";

// register user
export const register = asyncHandler(async (req, res) => {
  const {
    email,
    userName,
    fullName,
    password,
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    country = "India",
    phone,
  } = req.body;

  if (
    !email ||
    !userName ||
    !fullName ||
    !password ||
    !addressLine1 ||
    !city ||
    !state ||
    !pincode
  ) {
    return res
      .status(400)
      .json(new ApiError(400, "All required fields are necessary"));
  }

  const existingUser = await db.user.findFirst({
    where: {
      OR: [{ email }, { userName }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return res.status(400).json(new ApiError(400, "Email already exists"));
    }
    if (existingUser.userName === userName) {
      return res.status(400).json(new ApiError(400, "Username already exists"));
    }
  }

  const hashedPassword = await hashPassword(password);
  const apiKey = generateApiKeyString();

  let createdUser;

  try {
    createdUser = await db.$transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          email,
          userName,
          fullName,
          password: hashedPassword,
          phone,
          apiKey: {
            create: {
              apiKey,
              isActive: true,
            },
          },
          addresses: {
            create: {
              addressLine1,
              addressLine2,
              city,
              state,
              pincode,
              country,
              isDefault: true,
            },
          },
        },
        select: {
          id: true,
          email: true,
          userName: true,
          fullName: true,
          role: true,
          apiKey: {
            select: {
              apiKey: true,
            },
          },
          addresses: {
            select: {
              id: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              pincode: true,
              country: true,
              isDefault: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      const { token, tokenExpiry } = generateTemporaryToken();

      await prisma.user.update({
        where: { id: newUser.id },
        data: {
          emailVerificationToken: token,
          emailVerificationTokenExpiry: tokenExpiry,
        },
      });

      return { ...newUser, emailVerificationToken: token };
    });
  } catch (error) {
    console.error("Transaction failed:", error);
    return res.status(500).json(new ApiError(500, "User registration failed"));
  }

  const mailOptions = {
    email,
    subject: "Book Bazaar - Email Verification",
    mailGenContent: emailVerificationMailGenContent({
      userName,
      verificationUrl: `${process.env.APP_URL}/verify-email/${createdUser.emailVerificationToken}`,
    }),
  };

  const emailStatus = await sendEmail(mailOptions);
  if (!emailStatus) {
    console.error("Email sending failed");
    return res
      .status(400)
      .json(new ApiError(400, "Verification email not sent"));
  }

  res.status(201).json(
    new ApiResponse(
      201,
      {
        message:
          "User created successfully. Please check your email for verification.",
      },
      {
        ...createdUser,
        emailVerificationToken: undefined,
      },
    ),
  );
});

// verify email of user
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json(new ApiError(400, "Token is required"));
  }

  const user = await db.user.findFirst({
    where: {
      emailVerificationToken: token,
    },
  });

  if (!user) {
    return res
      .status(400)
      .json(new ApiError(400, "Invalid or already used token"));
  }

  if (Date.now() > user.emailVerificationTokenExpiry) {
    return res.status(400).json(new ApiError(400, "Token has expired"));
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    },
  });

  return res.status(200).json(
    new ApiResponse(200, {
      message: "Email verified successfully",
    }),
  );
});

// resend verification email to user
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json(new ApiError(400, "Email is required"));
  }

  
});

// login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json(new ApiError(400, "All fields are required"));
  }

  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return res.status(400).json(new ApiError(400, "User not found"));
  }

  if (!user.isEmailVerified) {
    return res.status(400).json(new ApiError(400, "Email not verified"));
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json(new ApiError(400, "Invalid credentials"));
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      refreshToken,
    },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  res
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60, // 1 hour
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    })
    .setHeader("X-Api-Key", user.apiKey.apiKey)
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          message: "Login successful",
        },
        {
          id: user.id,
          email: user.email,
          userName: user.userName,
          role: user.role,
        },
      ),
    );
});

// logout user
export const logout = asyncHandler(async (req, res) => {
  const { id } = req.user;

  if (!id) {
    return res.status(400).json(new ApiError(400, "User not found"));
  }

  await db.user.update({
    where: {
      id,
    },
    data: {
      refreshToken: null,
    },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };
  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json(
      new ApiResponse(200, {
        message: "Logout successful",
      }),
    );
});

// rotate an existing user api key
export const rotateApiKey = asyncHandler(async (req, res) => {
  const { id } = req.user;

  if (!id) {
    return res.status(400).json(new ApiError(400, "User not found"));
  }

  const currentApiKey = await db.apiKey.findFirst({
    where: {
      userId: id,
      isActive: true,
    },
  });

  if (!currentApiKey) {
    return res.status(400).json(new ApiError(400, "No active API key found"));
  }

  const newApiKey = generateApiKeyString();

  await db.$transaction(async (tx) => {
    await tx.apiKey.delete({
      where: {
        apiId: currentApiKey.apiId,
      },
    });

    await tx.apiKey.create({
      data: {
        userId: id,
        apiKey: newApiKey,
        isActive: true,
      },
    });
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { message: "API key rotated successfully" },
        { apiKey: newApiKey },
      ),
    );
});

// get user profile
export const getProfile = asyncHandler(async (req, res) => {
  const { id } = req.user;

  if (!id) {
    return res.status(400).json(new ApiError(400, "User not found"));
  }

  const user = await db.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userName: true,
      fullName: true,
      email: true,
      role: true,
      apiKey: {
        select: {
          apiKey: true,
          isActive: true,
        },
      },
      addresses: {
        where: {
          isDefault: true,
        },
        select: {
          addressLine1: true,
          city: true,
          state: true,
          pincode: true,
          country: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return res.status(400).json(new ApiError(400, "User not found"));
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        message: "User profile",
      },
      user,
    ),
  );
});

// forgot password
export const forgotPassword = asyncHandler(async (req, res) => {});

// reset password
export const resetPassword = asyncHandler(async (req, res) => {});

// renew refresh token
export const renewRefreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(400).json(new ApiError(400, "Refresh token not found"));
  }

  let decodedToken;
  try {
    decodedToken = verifyJwtToken({
      token: refreshToken,
      tokenType: "refresh",
    });
  } catch (error) {
    return res
      .status(401)
      .json(new ApiError(401, "Invalid or expired refresh token"));
  }

  const user = await db.user.findUnique({
    where: {
      id: decodedToken.id,
    },
  });

  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json(new ApiError(401, "Invalid refresh token"));
  }

  const newAccessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      refreshToken: newRefreshToken,
    },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  res
    .setCookie("accessToken", newAccessToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60, // 1 hour
    })
    .setCookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    })
    .status(200)
    .json(
      new ApiResponse(200, {
        message: "Refresh token renewed successfully",
      }),
    );
});

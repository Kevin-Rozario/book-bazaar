import asyncHandler from "../utils/asyncHandler.util.js";
import ApiResponse from "../utils/apiResponse.util.js";
import ApiError from "../utils/apiError.util.js";
import db from "../config/db.config.js";
import {
  sendEmail,
  emailVerificationMailGenContent,
  passwordResetMailGenContent,
} from "../utils/sendEmail.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.util.js";
import { generateTemporaryToken } from "../utils/generateToken.util.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyJwtToken,
} from "../utils/generateJwtTokens.js";
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
    country = "india",
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
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await db.user.findFirst({
    where: {
      OR: [{ email }, { userName }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(400, "Email already exists");
    }
    if (existingUser.userName === userName) {
      throw new ApiError(400, "Username already exists");
    }
  }

  const hashedPassword = await hashPassword(password);
  const apiKey = generateApiKeyString();

  let createdUser;

  try {
    createdUser = await db.$transaction(async (prisma) => {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          userName: userName.trim().toLowerCase(),
          fullName: fullName.trim(),
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
              addressLine1: addressLine1.trim(),
              addressLine2: addressLine2?.trim() || "",
              city: city.trim(),
              state: state.trim(),
              pincode,
              country: country.trim(),
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
    throw new ApiError(400, "User creation failed");
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
    throw new ApiError(500, "Email sending failed");
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
    throw new ApiError(400, "Token is required");
  }

  const user = await db.user.findFirst({
    where: {
      emailVerificationToken: token,
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired token");
  }

  if (Date.now() > user.emailVerificationTokenExpiry) {
    throw new ApiError(400, "Token has expired");
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
    throw new ApiError(400, "Email is required");
  }

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email already verified");
  }

  const { token, tokenExpiry } = generateTemporaryToken();

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: token,
      emailVerificationTokenExpiry: tokenExpiry,
    },
  });

  const mailOptions = {
    email,
    subject: "Book Bazaar - Email Verification",
    mailGenContent: emailVerificationMailGenContent({
      userName: user.userName,
      verificationUrl: `${process.env.APP_URL}/verify-email/${token}`,
    }),
  };

  // Send the email
  const emailStatus = await sendEmail(mailOptions);

  if (!emailStatus) {
    console.error("Email sending failed");
    throw new ApiError(500, "Email sending failed");
  }

  // Success response
  return res.status(200).json(
    new ApiResponse(200, {
      message: "Verification email sent successfully",
    }),
  );
});

// login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await db.user.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(400, "Email not verified");
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid password");
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

  const updatedUser = await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      refreshToken,
    },
    select: {
      apiKey: {
        select: {
          apiKey: true,
        },
      },
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
    .setHeader("X-Api-Key", updatedUser.apiKey.apiKey)
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
    throw new ApiError(400, "User not found");
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
    throw new ApiError(400, "User not found");
  }

  const currentApiKey = await db.apiKey.findFirst({
    where: {
      userId: id,
      isActive: true,
    },
  });

  if (!currentApiKey) {
    throw new ApiError(400, "No active API key found");
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
    throw new ApiError(400, "User not found");
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
    throw new ApiError(400, "User not found");
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
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const { token, tokenExpiry } = generateTemporaryToken();

  await db.user.update({
    where: { id: user.id },
    data: {
      forgotPasswordToken: token,
      forgotPasswordTokenExpiry: tokenExpiry,
    },
  });

  const options = {
    email: user.email,
    subject: "Book Bazaar - Password Reset Request",
    mailGenContent: passwordResetMailGenContent({
      userName: user.fullName,
      passwordResetUrl: `${process.env.APP_URL}/reset-password/${token}`,
    }),
  };

  const emailStatus = await sendEmail(options);
  if (!emailStatus) {
    console.error("Failed to send password reset email:", emailStatus);
    throw new ApiError(500, "Failed to send password reset email");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      message: "Password reset email sent successfully!",
    }),
  );
});

// reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    throw new ApiError(400, "Token and password are required");
  }

  const user = await db.user.findFirst({
    where: {
      forgotPasswordToken: token,
    },
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  if (
    !user.forgotPasswordTokenExpiry ||
    new Date() > user.forgotPasswordTokenExpiry
  ) {
    await db.user.update({
      where: { id: user.id },
      data: {
        forgotPasswordToken: null,
        forgotPasswordTokenExpiry: null,
      },
    });
    throw new ApiError(400, "Token has expired");
  }

  const hashedPassword = await hashPassword(password);

  await db.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      forgotPasswordToken: null,
      forgotPasswordTokenExpiry: null,
    },
  });

  return res.status(200).json(
    new ApiResponse(200, {
      message: "Password reset successfully!",
    }),
  );
});

// renew refresh token
export const renewRefreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token not found");
  }

  let decodedToken;
  try {
    decodedToken = verifyJwtToken({
      token: refreshToken,
      tokenType: "refresh",
    });
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await db.user.findUnique({
    where: {
      id: decodedToken.id,
    },
  });

  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, "Invalid refresh token");
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

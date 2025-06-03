import ApiError from "../utils/apiError.util.js";
import { verifyJwtToken } from "../utils/generateJwtTokens.js";

export const authMiddleware = (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;
  const apiKey = req.headers["x-api-key"];

  if (!accessToken || !refreshToken || !apiKey) {
    throw new ApiError(401, "Access token or refresh token not found");
  }

  try {
    const decodedToken = verifyJwtToken({
      token: accessToken,
      tokenType: "access",
    });

    if (!decodedToken) {
      throw new ApiError(401, "Invalid or expired access token");
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying access token:", error);
    throw new ApiError(401, "Access token verification failed");
  }
};

export const adminCheck = (req, res, next) => {
  const { role } = req.user;

  if (role !== "ADMIN") {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  next();
};

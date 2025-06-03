import ApiError from "../utils/apiError.util.js";
import { verifyJwtToken } from "../utils/generateJwtTokens.js";

export const authMiddleware = (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;
  const apiKey = req.headers["x-api-key"];

  if (!accessToken || !refreshToken || !apiKey) {
    return res.status(401).json(new ApiError(401, "Unauthorized"));
  }

  try {
    const decodedToken = verifyJwtToken({
      token: accessToken,
      tokenType: "access",
    });

    if (!decodedToken) {
      return res.status(401).json(new ApiError(401, "Unauthorized"));
    }
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying access token:", error);
    return res.status(401).json(new ApiError(401, "Unauthorized"));
  }
};

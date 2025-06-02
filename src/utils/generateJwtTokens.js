import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};

export const VerifyJwtToken = (options) => {
  if (!options.token) {
    return false;
  }
  if (options.tokenType === "access") {
    return jwt.verify(options.token, process.env.ACCESS_TOKEN_SECRET);
  }
  if (options.tokenType === "refresh") {
    return jwt.verify(options.token, process.env.REFRESH_TOKEN_SECRET);
  }
  return false;
};
import crypto from "crypto";

export const generateTemporaryToken = () => {
  const token = crypto.randomBytes(16).toString("hex");
  const tokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  return { token, tokenExpiry };
};

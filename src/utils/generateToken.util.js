import crypto from "crypto";

export const generateTemporaryToken = () => {
  const token = crypto.randomBytes(16).toString("hex");
  const tokenExpiry = Date.now() + 3600000; // 1 hour
  return { token, tokenExpiry };
};

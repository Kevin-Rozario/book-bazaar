import crypto from "crypto";

export const generateApiKeyString = () => {
  return crypto.randomBytes(16).toString("hex");
};

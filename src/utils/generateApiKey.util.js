import crypto from "crypto";

export const generateApiKeyString = () => {
  return crypto.randomBytes(64).toString("hex");
};

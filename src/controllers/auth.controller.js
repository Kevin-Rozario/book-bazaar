import asyncHandler from "../utils/asyncHandler.util.js";

// register user
export const register = asyncHandler(async (req, res) => {
  const {} = req.body;
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

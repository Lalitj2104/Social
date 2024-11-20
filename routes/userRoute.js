import express from "express";
import { LoginOtpResend, loginUser, LoginVerify, logoutUser, myProfile, registerUser, resendOtp, updateUser, verifyUser } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";

const userRouter=express.Router();

userRouter.post("/register",registerUser)
userRouter.post("/verify/:id",verifyUser)
userRouter.get("/resend/:id",resendOtp)
userRouter.post("/login",loginUser)
userRouter.post("/login/verify/:id",LoginVerify)
userRouter.get("/login/resend/:id",LoginOtpResend)
userRouter.get("/logout",isAuthenticated,logoutUser);
userRouter.get("/me",isAuthenticated,myProfile);
userRouter.patch("/update/profile",isAuthenticated,updateUser);


export default userRouter; 
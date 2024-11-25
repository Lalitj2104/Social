import { sendEMail } from "../middleware/sendMail.js";
import User from "../models/userModel.js";
import { message as msg } from "../utils/message.js";
import { Response } from "../utils/response.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cloudinary from "cloudinary";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      password,
      dob,
      mobile,
      bio,
      username,
      gender,
      avatar,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !dob ||
      !mobile ||
      !username ||
      !gender
    ) {
      return res.status(400).json({
        success: false,
        message: msg.missingFieldMessage,
      });
    }
    console.log("Password: ", password);

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({
        success: false,
        message: msg.userAlreadyExistMessage,
      });
    }

    user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: msg.userAlreadyExistMessage,
      });
    }
    //upload image in cloudinary
    if (avatar) {
      const result = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avators",
        //width:150
        //crp:"scale",
        //height:150,
      });
      req.body.avatar = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    user = await User.create({ ...req.body });

    const otp = Math.floor(100000 + Math.random() * 90000);
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpire = otpExpire;
    user.otpLockUntil = undefined;
    await user.save();

    let emailTemplate = fs.readFileSync(
      path.join(__dirname, "../templates/mail.html"),
      "utf-8"
    );
    //Email generation
    const subject = "Verify ur Account";
    // const body = `your OTP is ${otp}`;
    // await sendEMail({ email, subject, body });
    emailTemplate = emailTemplate.replace("{{OTP_CODE}}", otp);
    emailTemplate = emailTemplate.replaceAll("{{MAIL}}", process.env.SMTP_USER);
    emailTemplate = emailTemplate.replace("{{PORT}}", process.env.PORT);
    emailTemplate = emailTemplate.replace("{{USER_ID}}", user._id.toString());

    await sendEMail({ email, subject, html: emailTemplate });

    res.status(201).json({
      success: true,
      message: msg.userCreatedMessage,
      data: user._id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyUser = async (req, res) => {
  try {
    // Fetching id and otp
    const { id } = req.params;
    const { otp } = req.body;

    // Checking id and otp
    if (!id) {
      return Response(res, 400, false, msg.idNotFoundMessage);
    }

    // Find user
    let user = await User.findById(id);
    if (!user) {
      return Response(res, 404, false, msg.userNotFoundMessage);
    }
    console.log(user.otpLockUntil);

    // If user already verified
    if (user.isVerified) {
      return Response(res, 400, false, msg.userAlreadyVerifiedMessage);
    }

    // If otpAttempt is not locked
    if (user.otpLockUntil > Date.now()) {
      user.otp = undefined;
      user.otpExpire = undefined;
      user.otpAttempts = 0;
      await user.save();

      return Response(
        res,
        400,
        false,
        `Try again after ${Math.floor(
          (user.otpLockUntil - Date.now()) % (60 * 1000)
        )} minutes and ${Math.floor(
          (user.otpLockUntil - Date.now()) % 1000
        )} seconds`
      );
    }

    // Check otpAttempts
    if (user.otpAttempts >= 3) {
      user.otp = undefined;
      user.otpExpire = undefined;
      user.otpAttempts = 0;
      user.otpLockUntil = Date.now() + process.env.OTP_LOCK_TIME * 60 * 1000;
      await user.save();

      return Response(res, 400, false, msg.otpAttemptsExceededMessage);
    }

    // Check otp
    if (!otp) {
      user.otpAttempts += 1;
      await user.save();

      return Response(res, 400, false, msg.otpNotFoundMessage);
    }
    console.log(otp);

    // Check if otp is expired
    if (user.otpExpire < Date.now()) {
      user.otp = undefined;
      user.otpAttempts = 0;
      user.otpLockUntil = undefined;
      await user.save();

      return Response(res, 400, false, msg.otpExpiredMessage);
    }

    // If otp matches
    let ot = Number(otp);
    if (user.otp !== ot) {
      user.otpAttempts += 1;
      await user.save();

      return Response(res, 400, false, msg.invalidOtpMessage);
    }

    // Update user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;

    await user.save();

    // Authenticate user
    const token = await user.generateToken();

    const options = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    };

    res.status(200).cookie("token", token, options).json({
      success: true,
      message: msg.userVerifiedMessage,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: "false",
      message: error.message,
    });
  }
};

export const resendOtp = async (req, res) => {
  try {
    // params and body
    const { id } = req.params;

    //check id
    if (!id) {
      return Response(res, 400, false, msg.idNotFoundMessage);
    }

    //Find user & check user
    let user = await User.findById(id);
    if (!user) {
      return Response(res, 404, false, msg.userNotFoundMessage);
    }

    //Check if user is already verified
    if (user.isVerified) {
      return Response(res, 400, false, msg.userAlreadyVerifiedMessage);
    }

    //generate new otp
    console.log(process.env.OTP_EXPIRE);
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpire = new Date(
      Date.now() + process.env.OTP_EXPIRE * 15 * 60 * 1000
    );

    //save otp
    user.otp = otp;
    user.otpExpire = otpExpire;
    user.otpAttemptsExpire = undefined;
    user.otpAttempts = 0;
    await user.save();

    //send otp

    let emailTemplate = fs.readFileSync(
      path.join(__dirname, "../templates/mail.html"),
      "utf-8"
    );
    const subject = "Verify your account";
    // const body = `Your OTP is ${otp}`;
    // await sendEMail({email: user.email, subject, body});
    emailTemplate = emailTemplate.replace("{{OTP_CODE}}", otp);
    emailTemplate = emailTemplate.replaceAll("{{MAIL}}", process.env.SMTP_USER);
    emailTemplate = emailTemplate.replace("{{PORT}}", process.env.PORT);
    emailTemplate = emailTemplate.replace("{{USER_ID}}", user._id.toString());

    await sendEMail({ email, subject, html: emailTemplate });

    // send response
    Response(res, 200, true, msg.otpSendMessage);
  } catch (error) {
    Response(res, 500, false, error.message);
  }
};

export const loginUser = async (req, res) => {
  try {
    //parsing body data
    const { email, password } = req.body;
    console.log("Password: ", password);

    //checking data

    if (!email || !password) {
      return Response(res, 400, false, msg.missingFieldMessage);
    }
    //find user
    let user = await User.findOne({ email }).select("+password");
    //check user
    if (!user) {
      return Response(res, 400, false, msg.userNotFoundMessage);
    }
    // console.log(user);
    //if user not verified
    if (!user.isVerified) {
      return Response(res, 400, false, msg.userNotVerifiedMessage);
    }

    //if login attempt is locked
    if (user.lockUntil < Date.now()) {
      user.loginOtpAttempts = 0;
      user.loginOtp = undefined;
      await user.save();
      return Response(res, 400, false, msg.loginLockedMessage);
    }
    //iflogin attempts exceeded
    if (user.loginOtpAttempts >= process.env.MAX_LOGIN_ATTEMPTS) {
      user.loginOtpAttempts = 0;
      user.loginOtp = undefined;
      user.lockUntil = new Date(
        Date.now() + process.env.MAX_LOGIN_ATTEMPTS_EXPIRE * 60 * 1000
      );
      await user.save();

      return Response(res, 400, false, msg.loginLockedMessage);
    }

    //check password

    const isMatch = await user.matchPassword(password);
    console.log(isMatch);
    if (!isMatch) {
      user.loginOtpAttempts += 1;
      await user.save();

      return Response(res, 400, false, msg.badAuthMessage);
    }

    //generate otp
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpire = new Date(
      Date.now() + process.env.OTP_EXPIRE * 15 * 60 * 1000
    );

    //send otp

    let emailTemplate = fs.readFileSync(
      path.join(__dirname, "../templates/mail.html"),
      "utf-8"
    );
    const subject = "Two step verification";
    // const body = `Your OTP is ${otp}`;

    emailTemplate = emailTemplate.replace("{{OTP_CODE}}", otp);
    emailTemplate = emailTemplate.replaceAll("{{MAIL}}", process.env.SMTP_USER);
    emailTemplate = emailTemplate.replace("{{PORT}}", process.env.PORT);
    emailTemplate = emailTemplate.replace("{{USER_ID}}", user._id.toString());

    await sendEMail({ email, subject, html: emailTemplate });

    // Update user with otp
    user.loginOtp = otp;
    user.loginOtpExpire = otpExpire;
    user.loginOtpAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    // send response
    Response(res, 200, true, msg.otpSendMessage, user._id);
    // res.render("otp",{
    //   id:user._id,
    // });
  } catch (error) {
    //  Response(res, 500, false, error.message);
    return res.status(500).json({
      success: "false",
      message: error.message,
    });
  }
};

export const LoginVerify = async (req, res) => {
  try {
    //parsing
    const { id } = req.params;
    let { otp } = req.body;
    //checking id
    if (!id) {
      return Response(res, 400, false, msg.idNotFoundMessage);
    }

    //finding user
    let user = await User.findById(id);

    //checking user
    if (!user) {
      return Response(res, 400, false, msg.userNotFoundMessage);
    }
    // console.log(user);

    //if user not verified
    if (!user.isVerified) {
      return Response(res, 400, false, msg.userNotVerifiedMessage);
    }
    //checking lock to login
    if (user?.loginOtpAttemptsExpire > Date.now()) {
      return Response(res, 400, false, msg.loginLockedMessage);
    }
    //checking login attempts
    if (user?.loginOtpAttempts >= process.env.MAX_LOGIN_ATTEMPTS) {
      return Response(res, 400, false, msg.otpAttemptsExceededMessage);
    }

    //checking otp
    if (!otp) {
      user.otpAttempts += 1;
      await user.save();
      return Response(res, 400, false, msg.otpNotFoundMessage);
    }

    //checking expire time
    if (user?.loginOtpExpire < Date.now()) {
      return Response(res, 400, false, msg.otpExpiredMessage);
    }

    //matching the otp
    // console.log(otp);
    otp = Number(otp);
    // console.log(typeof otp);
    // console.log(typeof user.loginOtp);

    if (user?.loginOtp !== otp) {
      user.otpAttempts += 1;
      await user.save();

      return Response(res, 404, false, msg.invalidOtpMessage);
    }

    //saving after the verification
    user.loginOtpAttempts = 0;
    user.loginOtp = undefined;
    user.loginOtpExpire = undefined;
    user.loginOtpAttemptsExpire = undefined;
    await user.save();

    //generating and saving the token
    const token = await user.generateToken();
    // console.log(token);
    const options = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    };
    // console.log("working");
    //sending response
    res.status(200).cookie("token", token, options).json({
      success: true,
      message: msg.loginSuccessfulMessage,
      data: user,
    });
  } catch (error) {
    Response(res, 400, false, error.message);
  }
};

export const LoginOtpResend = async (req, res) => {
  try {
    //parsing the params
    const { id } = req.params;
    //checking id
    if (!id) {
      return Response(res, 400, false, msg.userNotFoundMessage);
    }
    //checking user
    let user = await User.findById(id);
    if (!user) {
      return Response(res, 404, false, msg.userNotFoundMessage);
    }
    //generating otp and saving
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpire = new Date(
      Date.now() + process.env.LOGIN_OTP_EXPIRE * 15 * 60 * 1000
    );

    user.loginOtp = otp;
    user.loginOtpExpire = otpExpire;
    user.loginOtpAttemptsExpire = undefined;
    user.loginOtpAttempts = 0;
    await user.save();

    //send mail

    let emailTemplate = fs.readFileSync(
      path.join(__dirname, "../templates/mail.html"),
      "utf-8"
    );
    const subject = "Two step verification";

    emailTemplate = emailTemplate.replace("{{OTP_CODE}}", otp);
    emailTemplate = emailTemplate.replaceAll("{{MAIL}}", process.env.SMTP_USER);
    emailTemplate = emailTemplate.replace("{{PORT}}", process.env.PORT);
    emailTemplate = emailTemplate.replace("{{USER_ID}}", user._id.toString());
    const email = user.email;
    await sendEMail({ email, subject, html: emailTemplate });

    // send response
    Response(res, 200, true, msg.otpSendMessage);
  } catch (error) {
    Response(res, 400, false, error.message);
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    Response(res, 200, true, msg.logoutMessage);
  } catch (error) {
    Response(res, 500, false, error.message);
  }
};

export const myProfile = async (req, res) => {
  try {
    if (!req.user) {
      return Response(res, 404, false, msg.userNotFoundMessage);
    }

    Response(res, 200, true, msg.userProfileFoundMessage, req.user);
  } catch (error) {
    Response(res, 500, false, error.message);
  }
};

export const updateUser = async (req, res) => {
  try {
    if (!req.user) {
      return Response(res, 404, false, msg.userNotFoundMessage);
    }

    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
      runValidators: true,
      timestamps: true,
      upsert: true,
    });

    Response(res, 200, true, msg.userProfileUpdatedMessage, user);
  } catch (error) {
    Response(res, 500, false, error.message);
  }
};




// import express from "express";
// import multer from "multer"
// import path from "path"
// import { loginUser, logoutUser, myProfile, registerUser, resendLoginOtp, resendOtp, updateUser, verifyLoginOtp, verifyUser } from "../controllers/userController.js";
// import { isAuthenticated } from "../middleware/auth.js";

// const storage = multer.diskStorage({
//     destination : function(req,file,cb){
//         cb(null, 'public/uploads/');
//     },
//     filename : function(req,file,cb){
//         cb(null,file.originalname + "-" +Date.now() + path.extname(file.originalname))
//     }
// });

// const upload = multer({
//     storage : storage,
//     fileFilter : function(req,file,cb){
//         const filetypes = /jpeg|jpg|png/;
//         const mimetype = filetypes.test(file.mimetype);
//         const extname = filetypes.test(path.extname(file.originalname));
//         if(mimetype && extname)
//         {
//             return cb(null, true);
//         }
//         cb("Error: File upload only supports the following file types - "+filetypes);
//     },
//     limits:{
//         fileSize:1024*1024*process.env.MAX_FILE_SIZE
//     }
// })

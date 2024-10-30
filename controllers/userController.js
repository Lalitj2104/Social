import { sendEMail } from "../middleware/sendMail.js";
import User from "../models/userModel.js";
import { message as msg } from "../utils/message.js";
import { Response } from "../utils/response.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let emailTemplate = fs.readFileSync(
  path.join(__dirname, "../templates/mail.html"),
  "utf-8"
);

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

    user = await User.create({ ...req.body });

    const otp = Math.floor(100000 + Math.random() * 90000);
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpire = otpExpire;
    user.otpLockUntil=undefined;
    await user.save();

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
      data: user,
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
    if(!id) {
        return Response(res, 400, false, msg.idNotFoundMessage)
    }
    

    // Find user
    let user = await User.findById(id);
    if(!user) {
        return Response(res, 404, false, msg.userNotFoundMessage)
    }
    console.log(user.otpLockUntil);

    // If user already verified
    if(user.isVerified) {
        return Response(res, 400, false, msg.userAlreadyVerifiedMessage)
    }

    // If otpAttempt is not locked
    if(user.otpLockUntil > Date.now()) {
        user.otp = undefined;
        user.otpExpire = undefined;
        user.otpAttempts = 0;
        await user.save();

        return Response(res, 400, false, `Try again after ${Math.floor((user.otpLockUntil - Date.now()) % (60*1000))} minutes and ${Math.floor((user.otpLockUntil - Date.now()) % (1000))} seconds`)
    }

    // Check otpAttempts
    if(user.otpAttempts >= 3) {
        user.otp = undefined;
        user.otpExpire = undefined;
        user.otpAttempts = 0;
        user.otpLockUntil = Date.now() + process.env.OTP_LOCK_TIME * 60 * 1000;
        await user.save();

        return Response(res, 400, false, msg.otpAttemptsExceededMessage)
    }

    // Check otp
    if(!otp){
        user.otpAttempts += 1;
        await user.save();

        return Response(res, 400, false, msg.otpNotFoundMessage)
    }
    console.log(otp)

    // Check if otp is expired
    if(user.otpExpire < Date.now()) {
        user.otp = undefined;
        user.otpAttempts = 0;
        user.otpLockUntil = undefined;
        await user.save();

        return Response(res, 400, false, msg.otpExpiredMessage)
    }

    // If otp matches
    if(user.otp !== otp) {
        user.otpAttempts += 1;
        await user.save();

        return Response(res, 400, false, msg.invalidOtpMessage)
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
        expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'none',
        secure: true
    }

    res.status(200).cookie('token', token, options).json({
        success: true,
        message: msg.userVerifiedMessage,
        data: user
    })


    
} catch (error) {
    return res.status(500).json({
      success:"false",
      message:error.message,
    })
}
}

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
    const { email, password } = req.body;
    console.log("Password: ", password);

    if (!email || !password) {
      return Response(res, 400, false, msg.missingFieldMessage);
    }
    let user = await User.findOne({ email }).select("+password");
    if (!user) {
      return Response(res, 400, false, msg.userNotFoundMessage);
    }
    if (user.lockUntil < Date.now()) {
      user.loginAttempts = 0;
      user.loginOtp = undefined;
      await user.save();
      return Response(res, 400, false, msg.loginLockedMessage);
    }

    if (user.loginAttempts >= process.env.MAX_LOGIN_ATTEMPTS) {
      user.loginAttempts = 0;
      user.loginOtp = undefined;
      user.lockUntil = new Date(
        Date.now() + process.env.MAX_LOGIN_ATTEMPTS_EXPIRE * 60 * 1000
      );
      await user.save();

      return Response(res, 400, false, msg.loginLockeedMessage);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      await user.save();

      return Response(res, 400, false, msg.badAuthMessage);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpire = new Date(
      Date.now() + process.env.OTP_EXPIRE * 15 * 60 * 1000
    );

    user.loginOtp = otp;
    user.loginOtpExpire = otpExpire;

    const subject = "Verify your account";
    // const body = `Your OTP is ${otp}`;

    emailTemplate = emailTemplate.replace("{{OTP_CODE}}", otp);
    emailTemplate = emailTemplate.replaceAll("{{MAIL}}", process.env.SMTP_USER);
    emailTemplate = emailTemplate.replace("{{PORT}}", process.env.PORT);
    emailTemplate = emailTemplate.replace("{{USER_ID}}", user._id.toString());

    await sendEMail({ email, subject, html: emailTemplate });

    await user.save();

    // send response
    Response(res, 200, true, message.otpSendMessage);
  } catch (error) {
    //  Response(res, 500, false, error.message);
    return res.status(500).json({
      success:"false",
      message:error.message,
    })
  }
};

export const LoginVerify = async (req, res) => {
  try {
    //parsing
    const { id } = req.params;
    const { otp } = req.body;
    //checking id
    if (!id) {
      return Response(res, 400, false, msg.idNotFoundMessage);
    }

    //checking user
    let user = await User.findById(id);
    if (!user) {
      return Response(res, 400, false, msg.userNotFoundMessage);
    }

    //checking lock to login
    if (user.lockUntil < Date.now()) {
      user.loginOtp = undefined;
      user.loginAttempts = 0;
      user.loginOtpExpire = undefined;
      await user.save();
      return Response(
        res,
        400,
        false,
        `Try again after ${Math.floor(
          (user.lockUntil - Date.now()) % (60 * 1000)
        )} minutes and ${(user.lockUntil - Date.now()) % 60} seconds`
      );
    }
    //checking login attempts
    if (user.loginAttempts >= 3) {
      user.loginOtp = undefined;
      user.loginAttempts = 0;
      user.loginOtpExpire = undefined;
      user.lockUntil =
        Date.now() + process.env.MAX_LOGIN_ATTEMPTS_EXPIRE * 60 * 1000;
      await user.save();
      return Response(res, 400, false, msg.otpAttemptsExceededMessage);
    }
    //checking otp
    if (!otp) {
      user.otpAttempts += 1;
      await user.save();
      return Response(res, 400, false, msg.OtpNotFoundMessage);
    }
    //checking expire time
    if (user.loginOtpExpire < Date.now()) {
      user.loginOtp = undefined;
      user.loginAttempts = 0;
      user.loginOtpExpire = undefined;
      user.lockUntil = undefined;
      await user.save();

      return Response(res, 400, false, msg.otpExpiresMessage);
    }

    //matching the otp
    otp = Number(otp);
    if (user.loginOtp !== otp) {
      user.otpAttempts += 1;
      await user.save();

      return Response(res, 401, false, message.invalidOtpMessage);
    }

    //saving after the verification
    user.loginAttempts = 0;
    user.loginOtp = undefined;
    user.loginOtpExpire = undefined;
    user.lockUntil = undefined;
    await user.save();

    //generating and saving the token
    const token = user.generateToken();

    const options = {
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    };
    //sending response
    res.status(200).cookie("token", token, options).json({
      success: true,
      message: message.userVerifiedMessage,
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
    //checking lock to login
    if (user.lockUntil < Date.now()) {
      return Response(
        res,
        400,
        false,
        `Try again after ${Math.floor(
          (user.lockUntil - Date.now()) % (60 * 1000)
        )} minutes and ${(user.lockUntil - Date.now()) % 60} seconds`
      );
    }

    //generating otp and saving
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpire = new Date(
      Date.now() + process.env.LOGIN_OTP_EXPIRE * 15 * 60 * 1000
    );

    user.loginOtp = otp;
    user.loginOtpExpire = otpExpire;
    user.lockUntil = undefined;
    user.loginAttempts = 0;
    await user.save();

    //send mail
    const subject = "Verify your account";

    emailTemplate = emailTemplate.replace("{{OTP_CODE}}", otp);
    emailTemplate = emailTemplate.replaceAll("{{MAIL}}", process.env.SMTP_USER);
    emailTemplate = emailTemplate.replace("{{PORT}}", process.env.PORT);
    emailTemplate = emailTemplate.replace("{{USER_ID}}", user._id.toString());

    await sendEMail({ email, subject, html: emailTemplate });

    // send response
    Response(res, 200, true, msg.otpSendMessage);
  } catch (error) {
    Response(res, 400, false, error.message);
  }
};

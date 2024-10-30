import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please add a first name"],
      minlength: [3, "First name must be at least 3 characters"],
    },
    middleName: {
      type: String,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: [true, "Plese add an emial"],
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
      minlength: [8, "Password must be atleast 8 characters"],
    },
    dob: {
      type: Date,
      required: [true, "Please add Date of Birth"],
      default: Date.now,
    },
    mobile: {
      type: Number,
      required: true,
      minlength: [10, "Mobile number must be atleast 10 digits"],
      maxlength: [10, "Mobile number must be at Max 10 digits"],
      unique: true,
    },
    username: {
      type: String,
      required: [true, "Please enter username"],
      unique: true,
    },
    bio: {
      type: String,
      default: " ",
      maxlength: [200, "Bio must be atmost 200 characters"],
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"],
      default: "male",
    },
    avatar: {
      public_id: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User_Soc",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User_Soc",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    resetPassword: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    otp: {
      type: Number,
    },
    otpExpire: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    loginOtp: {
      type: Number,
    },
    loginOtpExpire: {
      type: Date,
    },
    lockUntil: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpAttempts: {
      type: Number,
      default: false,
    },
    otpLockUntil: {
      type: Date,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    updateHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "History",
      },
    ],
    chats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],
    story: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.generateToken = async function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
  //return token
};

userSchema.methods.matchPassword = async function (Cpassword) {
  const isMatch = await bcrypt.compare(this.password, Cpassword);
  return isMatch;
};
const User = mongoose.model("User_Soc", userSchema);

export default User;

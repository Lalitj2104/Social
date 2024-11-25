import mongoose from "mongoose";
const postSchema = mongoose.Schema(
  {
    image: {
      public_id: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User_Soc",
      required: true,
    },
    caption: {
      type: String,
      default: "",
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User_Soc" }],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Comment"
          
      },
    ],
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user_Soc",
      },
    ],
    shared: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user_Soc",
      },
    ],
    saved: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user_Soc",
      },
    ],
    updateHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "History" }],
    location: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);
export default Post;

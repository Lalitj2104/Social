import Post from "../models/postModel.js";
import User from "../models/userModel.js";
import { message } from "../utils/message.js";
import { Response } from "../utils/response.js";

export const createPost = async (req, res) => {
  try {
    //checking req.user
    if (!req.user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }
    const {id}=req.user;
    let user=await User.findById(id);
    //checking if exist or not
    if(!user){
        return Response(res,400,false,message.userNotFoundMessage);
    }
    // getting the datafrom body
    const{image,caption,likes,mentions,shared,location}=req.body;

    //checking for image
    if (image) {
        const result = await cloudinary.v2.uploader.upload(image, {
          folder: "posts",
          //width:150
          //crp:"scale",
          //height:150,
        });
        req.body.image = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
      let post=await Post.create({
        image,
        owner:id,
        caption:caption,
        likes :likes||[],
        mentions: mentions || [],
      shared: shared || [],
      location: location || "",
      });

      await post.save();
      Response(res,200,true,message.postCreatedMessage,post);

  } catch (error) {
    Response(res, 500, false, error.message);
  }
};

export const getAllPost = async (req, res) => {
  try {
    if (!req.user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }
    const { id } = req.user;

    let user = await User.findById(id);
    if (!user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }
    const posts = await Post.find({ owner: id });
    if (!posts) {
      return Response(res, 400, false, message.postNotFoundMessage);
    }

    Response(res, 200, true, message.postFoundMessage, posts);
  } catch (error) {
    Response(res, 400, false, error.message);
  }
};

export const getPost = async (req, res) => {
  try {
    //checking req.user
    if (!req.user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }
    //parsing id and params
    const { post_id } = req.params;
    const { id } = req.user;
    //checking user
    let user = await User.findById(id);
    if (!user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }
    //checking post
    let post = await Post.findById(post_id);
    if (!post) {
      return Response(res, 400, false, message.postNotFoundMessage);
    }
    //checking if both user are same
    // if (post.owner.toString() !== id) {
    //     return Response(res, 403, false, message.notAuthorizedMessage);
    //   }
    //sending response
    Response(res, 200, true, message.postFoundMessage);
  } catch (error) {
    Response(res, 500, false, error.message);
  }
};

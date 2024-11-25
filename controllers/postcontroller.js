import Comment from "../models/commentModel.js";
import Post from "../models/postModel.js";
import Reply from "../models/replyModel.js";
import User from "../models/userModel.js";
import { message } from "../utils/message.js";
import { Response } from "../utils/response.js";

export const createPost = async (req, res) => {
  try {
    //checking req.user
    // if (!req.user) {
    //   return Response(res, 400, false, message.userNotFoundMessage);
    // }
    const { id } = req.user;
    let user = await User.findById(id);
    //checking if exist or not
    if (!user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }
    // getting the datafrom body
    const { image, caption, location } = req.body;

    if (!caption) {
      return Response(res, 400, false, message.missingFieldMessage);
    }
    if (!image) {
      return Response(res, 400, false, message.imageNotFoundMessage);
    }
    //checking for image
    if (image) {
      const result = await cloudinary.v2.uploader.upload(image, {
        folder: "posts",
        //width:150
        //crp:"scale",
        //height:150,
      });
    }
    let post = await Post.create({
      image: {
        public_id: result.public_id,
        url: result.secure_url,
      },
      owner: id,
      caption: caption,
      location: location,
    });

    await post.save();

    user.posts.unshift(post._id);
    await user.save();

    Response(res, 200, true, message.postCreatedMessage, post);
  } catch (error) {
    Response(res, 500, false, error.message);
  }
};

export const getAllPosts = async (req, res) => {
  try {
    if (!req.user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }

    const posts = await Post.find().populate("owner","username firstName avatar");
    if (!posts || posts.length==0) {
      return Response(res, 400, false, message.postsNotFoundMessage);
    }

    Response(res, 200, true, message.postsFoundMessage, posts);
  } catch (error) {
    Response(res, 400, false, error.message);
  }
};

export const getPostById = async (req, res) => {
  try {
   
    //parsing id and params
    const { post_id } = req.params;
    //checking post
    let post = await Post.findById(post_id).populate("owner","username firstName avatar");
    if (!post) {
      return Response(res, 400, false, message.postNotFoundMessage);
    }
    //sending response
    Response(res, 200, true, message.postFoundMessage);
  } catch (error) {
    Response(res, 500, false, error.message);
  }
};
export const getMyPosts = async (req, res) => {
  try {
    if (!req.user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }

    const posts = await Post.find({owner:req.user._id}).populate("owner","username firstName avatar");
    if (!posts) {
      return Response(res, 400, false, message.postsNotFoundMessage);
    }

    Response(res, 200, true, message.postsFoundMessage, posts);
  } catch (error) {
    Response(res, 400, false, error.message);
  }
};

export const deletePost = async (req, res) => {
  try {
   
    //destructuring the id
    const { id } = req.user;
    const { post_id } = req.params;
    //checking id
    if (!id) {
      return Response(res, 400, false, message.idNotFoundMessage);
    }
    const post = await Post.findById(post_id);
    if (!post) {
      return Response(res, 400, false, message.postNotFoundMessage);
    }
    //checking user
    const user = await User.findById(id);
    if (!user) {
      return Response(res, 400, false, message.userNotFoundMessage);
    }

    // checking if the owner and user is same
    if (user.owner.toString() !== id) {
      return Response(res, 400, false, message.notAuthorizedMessage);
    }

    await Post.findByIdAndDelete(post_id);
    Response(res, 200, true, message.postDeletedMessage);
  } catch (error) {
    Response(res, 500, false, error.message);
  }
};


export const addComment=async(req,res)=>{
  try {
   
    //checking parms for post
    const {id}=req.params;
    //checking id
    if(!id){
      return Response(res,400,message.idNotFoundMessage)
    }
    let post=await Post.findById(id);
    if(!post){
      return Response(res,400,message.postNotFoundMessage);
    }
    //parsing body
    const {comment}=req.body;
    if(!comment){
      return Response(res,400,message.missingFieldMessage);
    }
    //create comment
    const newComment=await Comment.create({
      comment,
      owner:req.user.id,
      post:post._id,

    })

    await post.comments.push(newComment._id);
    await post.save();
    
    //sending response
    Response(res,201,message.commentCreatedMessage,newComment)
  } catch (error) {
    Response(res,500,error.message);
  }
}

export const getCommentById=async(req,res)=>{
  try {
    //parsing the params
    const{commentId}=req.params;

    //checking the id
    if(!commentId){
      return Response(res,400,message.idNotFoundMessage);
    }

    const comment=await Comment.findById(commentId).populate("owner","username firstName avatar");
    if(!comment){
      return Response(res,400,message.commentNotFoundMessage);
    }
    Response(res,201,message.commentFoundMessage,comment);
    
  } catch (error) {
    Response(res,500,error.message);
  }
}


export const addReply=async(req,res)=>{
  try {
    //parsing the params
    const {commentId}=req.params;
    if(!commentId){
      return Response(res,400,message.idNotFoundMessage);
    }
    const comment=await Comment.findById(commentId).populate("owner","firstName username avatar");
    if(!comment){
      return Response(res,400,message.commentNotFoundMessage);
    }

    //checking body
    const {reply}= req.body;
    if(!reply){
      return Response(res,400,message.missingFieldMessage);
    }    
    const newReply=await Reply.create({
      reply,
      comment:comment._id,
      owner:req.user._id
    })

    await comment.reply.push(newReply._id);
    await comment.save();

    Response(res,200,message.replyCreatedMessage,newReply);

  } catch (error) {
    Response(res,500,error.message);
  }
}

export const getReplyById=async(req,res)=>{
  try {
     //parsing the params
     const{replyId}=req.params;

     //checking the id
     if(!replyId){
       return Response(res,400,message.idNotFoundMessage);
     }
 
     const reply=await Reply.findById(replyId).populate("owner","username firstName avatar");
     if(!reply){
       return Response(res,400,message.replyNotFoundMessage);
     }
     Response(res,201,message.replyFoundMessage,reply);
  } catch (error) {
    Response(res,500,error.message);
  }
}


export const getAllComments=async(req,res)=>{
  try {
    //parsing the params
    const {postId}=req.params;
    if(!postId){
      return Response(res,400,message.idNotFoundMessage)
    }

    //find post
    const post =await Post.findById(postId);
    if(!post){
      return Response(res,400,message.postFoundMessage)
    }

    const comments=await Comment.find({post:post._id})
    .populate({
      path:"owner",
      select:"username firstName avatar"}).populate({
        path:"owner",
        select:"username firstName avatar"
      });
    

    return Response(res,400,message.commentsFoundMessage,comments);
    
  } catch (error) {
    Response(res,500,error.message);
  }
}

export const getAllRepliesByComment=async(req,res)=>{
  try {
    
  } catch (error) {
    
  }
}

export const getAllRepliesByPost=async(req,res)=>{
  try {
    
  } catch (error) {
    
  }
}
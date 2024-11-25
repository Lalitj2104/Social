import { isAuthenticated } from "../middleware/auth.js";
import express from "express";
import { addComment, addReply, getAllComments, getAllRepliesByComment, getAllRepliesByPost, getCommentById, getReplyById } from "../controllers/postcontroller.js";

const commentRouter=express.Router();

commentRouter.post("/add",isAuthenticated,addComment);
commentRouter.get("/:id",isAuthenticated,getCommentById);
commentRouter.post("/add/reply/:id",isAuthenticated,addReply);
commentRouter.get("/reply/:replyId",isAuthenticated,getReplyById);
commentRouter.get("/all/:postId",isAuthenticated,getAllComments);
commentRouter.get("/replies/post/:postId",isAuthenticated,getAllRepliesByPost);
commentRouter.get("/replies/comment/:commentId",isAuthenticated,getAllRepliesByComment)
export default commentRouter;
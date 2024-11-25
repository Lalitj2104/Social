import express from "express";
import { createPost, deletePost, getAllPosts, getMyPosts, getPostById } from "../controllers/postcontroller.js";
import { isAuthenticated } from "../middleware/auth.js";

const postRouter=express.Router();

postRouter.post("/create",isAuthenticated,createPost);
postRouter.get("/all",isAuthenticated,getAllPosts);
postRouter.get("my",isAuthenticated,getMyPosts);
postRouter.get("/:id",isAuthenticated,getPostById);

postRouter.delete("/delete/:id",deletePost);
export default postRouter;
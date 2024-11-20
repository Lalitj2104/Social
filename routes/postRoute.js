import express from "express";
import { createPost, getAllPost, getPost } from "../controllers/postcontroller.js";
import { isAuthenticated } from "../middleware/auth.js";

const postRouter=express.Router();

postRouter.post("/create",isAuthenticated,createPost);
postRouter.get("/allpost",isAuthenticated,getAllPost);
postRouter.get("/post/:id",isAuthenticated,getPost);
export default postRouter;
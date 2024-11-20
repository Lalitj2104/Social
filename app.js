import express from "express";
import dotenv from "dotenv"
import userRouter from "./routes/userRoute.js";
import postRouter from "./routes/postRoute.js";
// import ejs from "ejs";
import path from "path"
import cors from "cors"
import cookieParser from "cookie-parser"

dotenv.config({path : "./config/config.env"})

const app=express(); 

app.set("view engine","ejs");
app.set("views",path.resolve("./views"));

app.use(cors({
    origin:[process.env.LOCAL_URL,process.env.WEB_URL],
    methods:["GET","PUT","POST","PATCH","DELETE"],
    credentials:true,
}))

app.use(express.json({limit:"50mb"}))
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());

app.get('/',(req,res)=>{
    // res.send("your server is active");
    res.render("home",{
        title:"Karnal"
    });
})

app.get("/login",(req,res)=>{
    res.render("login");
})



app.use("/api/v1/user",userRouter);
app.use("api/v1/post",postRouter);
export default app;
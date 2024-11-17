import app from "./app.js"
import connectDB from "./config/db.js"
import cloudinary from "cloudinary"
connectDB();

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUD_API_KEY,
    api_secret:process.env.CLOUD_API_SECRET,
})

app.listen(process.env.PORT,()=>{
    console.log(`Server running on port ${process.env.PORT}`)
})
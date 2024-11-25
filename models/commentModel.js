import mongoose from "mongoose";

const commentSchema=mongoose.Schema({
    comment:{
        type:String,
        required:true,
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User_Soc"
    },
    post:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Post",
    },
    likes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User_Soc"
    }],
    replies:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Reply"
    }]

},{
    timestamps:true
})
const Comment=mongoose.model("Comment",commentSchema);
export default Comment;
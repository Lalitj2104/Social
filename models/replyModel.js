import mongoose from "mongoose"

const replySchema=mongoose.Schema({
    reply:{
        type:String,
        required:true
    },
    comment:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Comment"
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User_Soc"
    },
   
    likes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User_Soc"
    }],
    

},{
    timestamps:true
})
const Reply=mongoose.model("Reply",replySchema);
export default Reply;
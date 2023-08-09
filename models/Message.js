const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
    sender:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    roomId: {
        type:String,
    },
    reciever: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    message: {
        type: String
    },
    reelVideo: {
        type:String
    },
    video: {
        type: String
    },
    image: {
        type: String
    },
    date: {
        type:Date,
        default: Date.now
    },
    reel: {
        type: Boolean,
        default:false
    },
    isReelCompleted: {
        type: Boolean,
        default:false
    },
    reaction:{
        type:Number,
        default:null
    },
    post:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'  
    },
    messageType:{
         type:String
    }
})

module.exports = Message = mongoose.model('message',MessageSchema)
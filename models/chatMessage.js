const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
    sender:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    roomId: {
        type:String,
        ref:'Chatroom'
    },
    message: {
        type: String
    },
    type:{
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
    }
})

module.exports = Message = mongoose.model('chatMessage',MessageSchema)
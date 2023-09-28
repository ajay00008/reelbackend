const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
    message:{
        type:String
    },
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    otherUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    type: {
        type: String
    },
    post:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
    },
    chatroom:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chatroom'
    },
    roomId:{
        type:String,
    },
    textMessage:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'message' 
    },
    date:{
        type:Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default:false
    }
})

module.exports = Notifications = mongoose.model('notification',NotificationSchema)
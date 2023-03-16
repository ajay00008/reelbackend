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
    media: {
        type: String
    },
    date: {
        type:Date,
        default: Date.now
    }
})

module.exports = Message = mongoose.model('message',MessageSchema)
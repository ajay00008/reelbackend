const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type:String,
        required:true,
        unqiue:true
    },
    password: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    firstName: {
        type: String,
        required: true
    },
    profile_no: {
        type: Number
    },
    lastName: {
        type: String,
        required: true
    },
    media: {
        type: String,
    },
    gender: {
        type: String,
    },
    fcmToken: {
        type: String
    },
    isFirstTime: {
        type: Boolean,
        default:false
    },
    categories: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'categories'
        }    
    ],
    following:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'user'
        }
    ],
    followers:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'user'
        }
    ],
})

module.exports = User = mongoose.model('user', UserSchema)
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
    phone:{
        type:Number,
        unique:true
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
    profileType:{
        type:String,
        enum: ["personal","business"],
        default:"personal"
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'categories'
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
    subscription:{
        type: Boolean,
        default:false
    },
    subscriptionType: {
        subType: {
            type:String,
            default: 'Trial'
        },
        reelMailCount: {
            type: Number,
            default:0
        },
        artCount: {
            type: Number,
            default:0
        },
        reelCoin: {
            type:Number,
            default:2
        }
    },
    hiddenPost: [
        {
            post: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'post'
            }
        }
    ],
    isVerified:{
        type:Boolean,
        // default:false
    },
    savedPosts:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'post',
            select:false
        }
    ],
})

module.exports = User = mongoose.model('user', UserSchema)
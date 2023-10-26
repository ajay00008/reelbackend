const mongoose = require('mongoose')

const PostSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    text:{
        type: String,
    },
    media: {
        type: String
    },
    image:{
        type: String
    },
    video:{
        type: String
    },
    reelVideo: {
        type:String
    },
    location: {
        type: String
    },
    postType: {
        type: String
    },
    mimeType: {
        type:String
    },
    isReelMail:{
      type:Boolean,
      default:false
    },
    thumbnail_url:{
        type:String
    },
    likes:[
        {
            user:{
                type: mongoose.Schema.Types.ObjectId,
                ref:'user'
            }
        }
    ],
    comments:[
        {
            user:{
                type: mongoose.Schema.Types.ObjectId,
                ref:'user'
            },
            text:{
                type: String,
                required: true            
            },
            date:{
                type:Date,
                default: Date.now
            },
            isReplied: {
                type: Boolean
            },
            likes:[
                {
                    user:{
                        type: mongoose.Schema.Types.ObjectId,
                        ref:'user'
                    }
                }
            ],
            replies: [
                {
                    user:{
                        type: mongoose.Schema.Types.ObjectId,
                        ref:'user'
                    },
                    text:{
                        type: String,
                        required: true            
                    },
                    date:{
                        type:Date,
                        default: Date.now
                    },
                }
            ]
        }
    ],
    reelWatch: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
          },
          visitTime: {
            type: Date,
            default: new Date().toLocaleString(),
          },
        },
      ],
    views: [                                        // views means StoryView
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
            },
            viewedAt: {
                type: Date,
                default: new Date().toLocaleString(),
            },
        },
    ],
    date:{
        type:Date,
        default: Date.now
    }
})

module.exports = Post = mongoose.model('post',PostSchema)
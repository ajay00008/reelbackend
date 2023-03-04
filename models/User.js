const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    media: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    pushToken: {
        type: String
    },
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
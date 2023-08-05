const  {Schema, model} = require('mongoose');

const chatRoomSchema = new Schema({
    members: {
        type: [{ type: Schema.Types.ObjectId, ref: "user" }],
    },
    admin: {
        type: [{ type: Schema.Types.ObjectId, ref: "user" }],
    },
    image:{
        type: String
    },
    isGroup:{
        type: Boolean,
        default:false
    }},
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports =  chatroom =  model('Chatroom', chatRoomSchema);


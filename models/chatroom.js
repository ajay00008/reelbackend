const { Schema, model } = require("mongoose");

const chatRoomSchema = new Schema(
  {
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "user" }],
    },
    admin: {
      type: String,
      ref: "user",
    },
    image: {
      type: String,
    },
    text: {
      type: String
    },
    type:{
      type:String
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = chatroom = model("Chatroom", chatRoomSchema);

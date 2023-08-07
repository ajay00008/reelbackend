const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    roomId: {
      type: String,
      ref: "Chatroom",
    },
    text: {
      type: String,
    },
    type: {
      type: String,
    },
    reelVideo: {
      type: String,
    },
    video: {
      type: String,
    },
    image: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    reel: {
      type: Boolean,
      default: false,
    },
    reelVideo: {
      type: String,
    },
    isReelCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = chatMessage = mongoose.model("chatMessage", ChatMessageSchema);

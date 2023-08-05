const express = require("express");
const connectDB = require("./config/db");
const fileUpload = require("express-fileupload");
const path = require("path");
const sendFirebaseNotifications = require("./middleware/notifications");
require("dotenv/config");

var cors = require("cors");
const Message = require("./models/Message");
const User = require("./models/User");
const { mailConnected } = require("./service/nodemailer");
const auth = require("./middleware/auth");
const app = express();

connectDB();
mailConnected();

const PORT = process.env.PORT || 5000;

// app.use(fileUpload())

app.use(
  fileUpload({
    useTempFiles: true,
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  })
);

app.use(
  express.json({
    extended: false,
  })
);
app.use(cors());
app.use("media/image", express.static("image"));
app.use("media/video", express.static("image"));

app.get("/", (req, res) => {
  res.send("API Runnin successfully-pipelinedone");
});

app.get("/media/image/:name", (req, res) => {
  res.sendFile(path.join(__dirname, `./media/image/${req.params.name}`));
});

app.get("/media/video/:name", (req, res) => {
  res.sendFile(path.join(__dirname, `./media/video/${req.params.name}`));
});

app.get("/media/thumbnail/:name", (req, res) => {
  res.sendFile(path.join(__dirname, `./media/thumbnail/${req.params.name}`));
});

app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/posts", require("./routes/api/posts"));
app.use("/api/user", require("./routes/api/user"));
app.use("/api/reel", require("./routes/api/reel"));
app.use("/api/messages", require("./routes/api/messages"));
app.use("/api/notifications", require("./routes/api/notifications"));
app.use("/api/subscription", require("./routes/api/subscription"));
app.use("/api/chats", require("./routes/api/chats"));
app.use("/api/groups", auth, require("./routes/api/group"));

const server = app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Connected To Socket.Io");
  // console.log(socket.client.conn.server.clientsCount,'DAAA')

  socket.on("getUsers", () => {});
  socket.on("setup", (userData) => {
    console.log("Sett", userData);
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (roomId) => {
    socket.join(roomId);
    console.log("User Joined Room", roomId);
  });

  socket.on("new message", async (newMessageRec) => {
    console.log(newMessageRec, "newwwmee");
    socket
      .in(newMessageRec.reciver._id)
      .emit("message recieved", newMessageRec);
    const newMessage = await new Message({
      roomId: newMessageRec.roomId,
      sender: newMessageRec.user._id,
      reciever: newMessageRec.reciver._id,
      message: newMessageRec.text,
    });
    await newMessage.save();
    const sendingUser = await User.findById(newMessageRec.user._id);
    if (newMessageRec.reciver.fcmToken) {
      sendFirebaseNotifications(
        `${newMessageRec.user.name} Sent You A Message`,
        newMessageRec.reciver.fcmToken,
        JSON.stringify(sendingUser),
        "chat"
      );
    }
  });

  // latest socket [GROUP]
  const rooms = {};

  socket.on("joinroom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room ${roomId}`);

    // If the room doesn't exist in the rooms object, create it
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // Send previous messages to the newly joined user
    // socket.emit("message", rooms[roomId]);

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
  // Handle incoming chat messages
  socket.on("chat message", (data) => {
    console.log("Received message:", data);
    console.log(rooms, "heee");

    const { roomId, message, id, name } = data;

    // Save the message to the room's message history
    if (rooms[roomId]) {
      rooms[roomId].push({
        chatroom: roomId,
        sender: id,
        message: message,
        name,
      }); // Include sender's information
    } else {
      rooms[roomId] = [
        { chatroom: roomId, sender: id, message: message, name },
      ];
    }
    console.log(roomId, "rommmmmm", message);
    console.log(rooms, "heee");
    // Broadcast the message to all clients in the room
    io.to(roomId).emit("chat message", { sender: id, message: message  });
  });
});

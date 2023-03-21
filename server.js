const express = require("express");
const connectDB = require("./config/db");
const fileUpload = require("express-fileupload");
const path  = require('path')


var cors = require("cors");
const Message = require("./models/Message");
const { socketBaseUrl, currentBaseUrl } = require("./utils/activeUrl");
const app = express();

connectDB();

const PORT = process.env.PORT || 5000;

// app.use(fileUpload())

app.use(
  fileUpload({
    useTempFiles:true,
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
app.use('media/image', express.static('image'));
app.use('media/video', express.static('image'));


app.get("/", (req, res) => {
  res.send("API Running");
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


app.use('/api/auth',require('./routes/api/auth'))
app.use('/api/posts',require('./routes/api/posts'))
app.use('/api/user',require('./routes/api/user'))
app.use('/api/reel',require('./routes/api/reel'))
app.use('/api/messages',require('./routes/api/messages'))



const server = app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});


const io = require('socket.io')(server, {
  pingTimeout:60000,
  cors: {
    origin:'http://18.118.12.12:5000'
  }
})

io.on("connection", (socket) => {
  console.log('Connected To Socket.Io')
  // console.log(socket.client.conn.server.clientsCount,'DAAA')

  socket.on('getUsers', () => {
  })
  socket.on('setup', (userData) => {
    socket.join(userData._id)
    socket.emit('connected')
  })

  socket.on('join chat', (roomId) => {
    socket.join(roomId)
    console.log("User Joined Room", roomId)
  })

  socket.on('new message', async(newMessageRec) => {
    socket.in(newMessageRec.reciver._id).emit('message recieved', newMessageRec)
    const newMessage = await new Message ({
      roomId:newMessageRec.roomId,
      sender:newMessageRec.user._id,
      reciever:newMessageRec.reciver._id,
      message:newMessageRec.text,
    })
    await newMessage.save()
  })

})

const express = require("express");
const connectDB = require("./config/db");
const fileUpload = require("express-fileupload");
const path  = require('path')


var cors = require("cors");
const app = express();

connectDB();

const PORT = process.env.PORT || 5000;

// app.use(fileUpload())

// app.use(
//   fileUpload({
//     limits: {
//       fileSize: 50 * 1024 * 1024,
//     },
//   })
// );


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


app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});

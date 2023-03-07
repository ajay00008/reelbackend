const express = require("express");
const connectDB = require("./config/db");
const fileUpload = require("express-fileupload");

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

app.get("/", (req, res) => {
  res.send("API Running");
});

app.use('/api/auth',require('./routes/api/auth'))
app.use('/api/posts',require('./routes/api/posts'))
app.use('/api/user',require('./routes/api/user'))


app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});

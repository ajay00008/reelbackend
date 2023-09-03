const express = require("express");
const blogs = require("../../models/blogs");
const router = express.Router();
const { blogValidator} = require("../../utils/validators/blogValidator");
const { validationResult } = require("express-validator");

router.get("/", async (req, res) => {
  try {
    const blogsData = await blogs.find({}).limit(10);
    return res.json({ blogs:blogsData, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/:id", async (req, res) => {
  const{id}=req.params
  try {
    const post = await blogs.findById(id);
    return res.status(200).json({ blog: post, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", blogValidator , async (req, res) => {
  const{title , description}= req.body 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.errors)
    return res.status(422).json({ success: false, errors: errors.errors[0].msg, message:'validation error' });
  }
  try {
    const blog = new blogs({
       title,description 
    })
    const newBlog= await blog.save();
    return res.status(201).json({ blog:newBlog, status: 200 ,success:true});
  } catch (err) {
    console.log(err.message);
    res.status(500).json({errors:err.message , message:'internal server error', success:false});
  }
});

module.exports = router;
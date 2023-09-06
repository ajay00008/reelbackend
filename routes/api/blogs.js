const express = require("express");
const blogs = require("../../models/blogs");
const router = express.Router();
const { blogValidator} = require("../../utils/validators/blogValidator");
const { validationResult } = require("express-validator");
const { Types } = require("mongoose");

router.get("/", async (req, res) => {
  try {
    const blogsData = await blogs.find({}).limit(10).sort({createdAt:-1});
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
  const{id , title , description}= req.body 
  console.log(req.body,"bodyy")
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.errors)
    return res.status(422).json({ success: false, errors: errors.errors[0].msg, message:'validation error' });
  }
  try {
    const query = { _id: new Types.ObjectId(id)};
    const update = { title, description };
    const options = {
      new: true, 
      upsert: true, 
    };

    const blog = await blogs.findOneAndUpdate(query, update, options);
    return res.status(201).json({ blog, status: 200 ,success:true});
  } catch (err) {
    console.log(err.message);
    res.status(500).json({errors:err.message , message:'internal server error', success:false});
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedBlog = await blogs.findByIdAndRemove(req.params.id);

    if (!deletedBlog) {
      return res.status(404).json({ message: 'Blog not found' ,success:false});
    }

    return res.json({ message: 'Blog deleted successfully', deletedBlog ,success:true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' , success:false });
  }
});



module.exports = router;
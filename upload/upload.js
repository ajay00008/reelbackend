const express = require("express");
const json = express.json();
const AWS = require("aws-sdk");
const { S3 } = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

module.exports = async function uploadImageTos3Bucket(files) {
  var imageUrl = null;
  const s3 = new AWS.S3({
    credentials: {
      accessKeyId:process.env.AWS_ACCESS_KEY,
      secretAccessKey:process.env.AWS_SECRET_KEY,
    },
  });

  const uploadParams = {
    Bucket: "reelmails",
    Key: files.originalname,
    Body: files.buffer,
    ContentType: files.mimetype,
    ACL: "public-read",
  };

  return new Promise((resolve, reject) => {
    s3.upload(uploadParams, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

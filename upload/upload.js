const express = require("express");
const json = express.json();
const AWS = require("aws-sdk");
const { S3 } = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

module.exports = async function uploadImageTos3Bucket(files) {
  var imageUrl = null;
  const s3 = new AWS.S3({
    credentials: {
      accessKeyId: "AKIAXKJA67ZDLQXTQDET",
      secretAccessKey: "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",
    },
  });

  const uploadParams = {
    Bucket: "reelmails",
    Key: files.media.name,
    Body: Buffer.from(files.media.data),
    ContentType: files.media.mimetype,
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

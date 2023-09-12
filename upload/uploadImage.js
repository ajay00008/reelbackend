const sharp = require("sharp");
const express = require("express");
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
const fs = require("fs");

const s3 = new AWS.S3({
  credentials: {
    // accessKeyId: "AKIAXKJA67ZDLQXTQDET",
    // secretAccessKey: "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",
    accessKeyId:process.env.AWS_ACCESS_KEY,
    secretAccessKey:process.env.AWS_SECRET_KEY,
  },
});



const uploadImage = async function uploadImageTos3Bucket(files) {
  console.log(files.name, "kkkk");
  var imageUrl = null;
  const s3 = new AWS.S3({
    credentials: {
      accessKeyId:process.env.AWS_ACCESS_KEY,
      secretAccessKey:process.env.AWS_SECRET_KEY,
    },
  });

  const key = files.name; // The key should include the desired folder structure and the original filename
  const body = fs.createReadStream(files.tempFilePath);
  const contentType = files.mimetype;
  const acl = "public-read"; // Set the ACL as needed (e.g., public-read for public access)

  const uploadParams = {
    Bucket: "reelmails",
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: acl,
    ServerSideEncryption: "AES256",
    StorageClass: "STANDARD",
  };

  return new Promise((resolve, reject) => {
    s3.upload(uploadParams, function (err, data) {
      if (err) {
        reject(err);
      } else {
        console.log(data, "jj");
        resolve(data);
      }
    });
  });
};

const resizeAndUploadImage = async (image) => {
  try {
    console.log(image, "nn");
    const key = "folder/subfolder/" + image.name;
    const body = fs.readFileSync(image.tempFilePath);
    const contentType = image.mimetype;
    const acl = "public-read";
    // Resize the image using sharp
    const resizedBuffer = await sharp(body)
      .resize(800, 600) // Adjust the width and height as needed
      .toBuffer();

    // Upload the resized image to S3
    const uploadParams = {
      Bucket: "reelmails",
      Key: key,
      Body: resizedBuffer,
      ContentType: contentType,
      ACL: acl,
      ServerSideEncryption: "AES256",
      StorageClass: "STANDARD",
    };

    const data = await s3.upload(uploadParams).promise();
    console.log("Image uploaded successfully:", data);
    // Optionally, you can remove the temporary file on your server.
    fs.unlinkSync(image.tempFilePath);
    return data;
  } catch (err) {
    console.error("Error uploading/resizing image:", err);
    throw err;
  }
};

module.exports = { uploadImage, resizeAndUploadImage };

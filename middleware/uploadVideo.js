const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require('multer-s3');


aws.config.update({
  useAccelerateEndpoint:true,
  credentials: {
    accessKeyId: "AKIAXKJA67ZDLQXTQDET",
    secretAccessKey: "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",
    region: "us-east-2",
  },
});

s3 = new aws.S3();
s3.config.httpOptions.timeout = 0

module.exports = uploadVideo = multer({
  storage: multerS3({
      s3: s3,
      acl: 'public-read',
      bucket: 'reelmails',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
          console.log(file);
          cb(null, file.originalname); //use Date.now() for unique file keys
      }
  })
});
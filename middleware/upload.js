const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require('multer-s3-transform');
const sharp = require('sharp');


aws.config.update({
  useAccelerateEndpoint:true,
  credentials: {
    accessKeyId: "AKIAXKJA67ZDLQXTQDET",
    secretAccessKey: "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",
    region: "us-east-2",
  },
});

s3 = new aws.S3();
module.exports = upload = multer({
  storage: multerS3({
      s3: s3,
      acl: 'public-read',
      bucket: 'reelmails',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      shouldTransform: function (req, file, cb) {
        cb(null, /^image/i.test(file.mimetype))
      },
      transforms: [{
        key: function (req, file, cb) {
          console.log(file);
          cb(null, file.originalname); //use Date.now() for unique file keys
      },
      transform: function (req, file, cb) {
        //Perform desired transformations
        cb(null, sharp().resize(300, 300).jpeg({quality:90}))
      }
  }], 

  })
});

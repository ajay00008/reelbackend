const multer = require('multer')

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    },
    destination: function (req, file, cb) {
        console.log('storage')
        if (file.fieldname == 'image') {
            cb(null, './media/image')
        } else {
            cb(null, './media/video')
        }
    },
})
const uploadVideo = multer({ storage })

module.exports = uploadVideo
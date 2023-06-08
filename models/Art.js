const mongoose = require('mongoose')

const ArtSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
})

module.exports = Art = mongoose.model('art', ArtSchema)
const {Types , Schema , model} = require('mongoose')

const blogsSchema = new Schema({
    title:{
        type:String ,
        unique:true,
    },
    description:String,
},
{
    timestamps:true,
    versionKey:false
})


module.exports = blog = model('blog',blogsSchema)
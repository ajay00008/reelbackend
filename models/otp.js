const {Types , Schema , model} = require('mongoose')

const otpSchema = new Schema({
    email:{
        type:String ,
        unique:true,
    },
    otp:String,
    expiresAt : {
        type:Date
    }
},
{
    timestamps:true,
    versionKey:false
})

module.exports = Otp = model('otp',otpSchema)
const jwt = require('jsonwebtoken')
const config = require('config')
const User = require('../models/User')

module.exports = async function(req,res,next){
    const token = req.header('x-auth-token')

    if(!token){
        return res.status(401).json({msg:'No Token, Authorization Denied',error:'please login'})
    }

    try{
        const decoded = jwt.verify(token,'mysecrettoken')
        const user = await User.findById(decoded.user.id).select("-password");
        if(!user){
            return res.status(404).json({msg:'user not found' , error:"unknown user"})
        }
        req.user = decoded.user
        next();
    }catch(err){
        res.status(401).json({msg:'Token is not valid'})
    }
}
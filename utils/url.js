module.exports={
    baseUrl:(req)=>{
        return   `${req.protocol}://${req.headers.host}/`
    }
}

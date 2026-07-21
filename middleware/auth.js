const jwt = require("jsonwebtoken");

const authentication = (req,res,next)=>{
    const authHeader = req.headers['authorization'];

    if(!authHeader){
        return res.status(401).json({message:"Authorization header missing"});
    }
    const token = authHeader.split(' ')[1];
    if(!token){
        return res.status(401).json({message:"Token missing"});
    }
    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    }catch(err){
        return res.status(403).json({message:"Invalid token"});
    }
}

module.exports = authentication;
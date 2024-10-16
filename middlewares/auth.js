const jwt = require('jsonwebtoken');
const jwt_secret='secret';


const authenticateToken = (req, res, next) => {
    // console.log(req.header)
    const token = req.header('authorization')?.split(' ')[1];
    // console.log(token);
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, jwt_secret);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};
module.exports= authenticateToken;
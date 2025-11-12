const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = req.cookies?.accessToken || (authHeader && authHeader.split(" ")[1]);

        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // attach user info
        next();
    } catch (err) {
        return res.status(403).json({ error: "Forbidden: Invalid or expired token" });
    }
};

module.exports = verifyToken;

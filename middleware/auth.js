const requireAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
};

module.exports = requireAuth;

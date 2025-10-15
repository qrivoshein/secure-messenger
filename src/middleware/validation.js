const { body, query, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: errors.array()[0].msg,
            errors: errors.array()
        });
    }
    
    next();
};

const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores and hyphens'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    
    validate
];

const loginValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    validate
];

const searchValidation = [
    query('q')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Search query must be between 1 and 50 characters'),
    
    validate
];

const messageParamValidation = [
    param('otherUser')
        .trim()
        .notEmpty()
        .withMessage('Other user is required'),
    
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    searchValidation,
    messageParamValidation
};

import { Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult, ValidationChain } from 'express-validator';

const validate = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        res.status(400).json({ 
            error: errors.array()[0].msg,
            errors: errors.array()
        });
        return;
    }
    
    next();
};

export const registerValidation: ValidationChain[] = [
    body('username')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores and hyphens'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    
    validate as any
];

export const loginValidation: ValidationChain[] = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    validate as any
];

export const searchValidation: ValidationChain[] = [
    query('q')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Search query must be between 1 and 50 characters'),
    
    validate as any
];

export const messageParamValidation: ValidationChain[] = [
    param('otherUser')
        .trim()
        .notEmpty()
        .withMessage('Other user is required'),
    
    validate as any
];

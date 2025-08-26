import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log("Token:", token);
    if (!token) {
        return res.status(401).json({ message: 'Access token is missing' });
    }

    try {
        const secret = process.env.JWT_SECRET as string || ''; // Ensure secret is a string

        if (!secret) {
            throw new Error('JWT_SECRET is not defined');
        }
        const decoded = jwt.verify(token, secret);
        (req as any).user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}
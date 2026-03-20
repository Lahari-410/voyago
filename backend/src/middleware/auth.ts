import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include our user data
// This lets us access req.user in any route after authentication
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

// This middleware runs BEFORE protected routes
// It checks: "does this request have a valid login token?"
// If yes → continues to the route
// If no  → returns 401 Unauthorized

const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Token comes in the Authorization header as: "Bearer eyJhbGciO..."
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided. Please login.' });
    return;
  }

  // Extract just the token part (remove "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify() checks if the token is valid and not expired
    // It uses our JWT_SECRET from .env to decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      email: string;
      name: string;
    };

    // Attach user info to the request so routes can use it
    req.user = decoded;

    // Call next() to continue to the actual route handler
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token. Please login again.' });
  }
};

export default authMiddleware;

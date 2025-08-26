import jwt from 'jsonwebtoken';

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  // Proper typing and usage of jwt.sign()
  const token = jwt.sign(
    { userId },        // payload
    secret,            // secret key (must be string)
    { expiresIn: '1d' }  // options
  );

  return token;
};

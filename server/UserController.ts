import { Request,Response } from "express";
// import token from "../generateToken";
// Update the path below to the correct location if needed
import {generateToken} from "./generateToken";

// controllers/UserController.ts or wherever you're handling login
const user = {
  email: 'user@123gmail.com',
  password: '12345678' // check spelling & case
};
export const loginuser = (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("Login attempt with email:", email);
  
  if (email === user.email && password === user.password) {
    const token = generateToken(email);
    console.log("Token generated:", token);
    res.json({ token });
  } else {
    console.log("Invalid credentials");
    res.status(401).json({ message: "Invalid credentials" });
  }
};
// Mock user data for demonstration purposes
// In a real application, you would fetch this from a database or another secure source.
// Ensure the email and password match the mock user data
// This is just an example; do not use hardcoded credentials in production.
// You should implement proper user authentication and password hashing.
// Example of a mock user for demonstration purposes
// Ensure the email and password match the mock user data
// This is just an example; do not use hardcoded credentials in production.
// You should implement proper user authentication and password hashing.
// Example of a mock user for demonstration purposes
// Ensure the email and password match the mock user data      

// const mockuser = {
//     username: "rajat",
//     password: "rajat123"
// }
// export const loginuser = (req: Request, res: Response) => {
//     const { username, password } = req.body;
//     if (username === mockuser.username && password === mockuser.password) {
//         const token = generateToken(username);
//         console.log("Token generated:", token);
//         res.json({ token });
//     } else {
//         res.status(401).json({ message: "Invalid credentials" });
//     }
// }



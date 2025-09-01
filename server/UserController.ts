import { Request, Response } from "express";
import { openDB } from "./db";
// import token from "../generateToken";
// Update the path below to the correct location if needed
import { generateToken } from "./generateToken";
import bcrypt from "bcrypt";

// controllers/UserController.ts or wherever you're handling login
const user = {
  email: 'user@123gmail.com',
  password: '12345678' // check spelling & case
};
export const loginuser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("Login attempt with email:", email,password);
  try {
    const db = await openDB();
    console.log("Database connection established");
    console.log("Querying for user:", db);
    const user = await db.get('SELECT * FROM users WHERE username = ?', email);
    console.log("User fetched from DB:", user);
    if (!user) {
      console.log("User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Check password using bcrypt (assuming hashed password in DB)
    const validPassword = await bcrypt.compare(password, user.password);
    console.log("Password valid:", validPassword);
    if (!validPassword) {
      console.log("Password mismatch");
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Generate JWT token with userId (or email) in payload
    const token = generateToken(user.id.toString());
    console.log("Token generated:", token);

    res.json({ token });

  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
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



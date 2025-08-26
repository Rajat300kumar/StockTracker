import {Request, Response} from "express";
import {Router} from 'express';
// import token from "../generateToken";
 import{loginuser} from "../UserController"; // Update the path below to the correct location if needed
const router = Router();
router.post('/login', loginuser); // Define the login route
export default router; // Export the router to use in your server setup



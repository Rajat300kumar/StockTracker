import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import stockRoutes from './routes/stockRoutes'; // <-- Add this line
import authRoutes from './routes/authRoutes';
import dotenv from 'dotenv';
import { authMiddleware } from './util/authMiddleware';
import { web_apiRoutes } from './routes/web_apiRoutes';
import predictionRoutes from './routes/predictionRoutes';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/api/auth', authRoutes);
console.log("JWT_SECRET is:", process.env.JWT_SECRET);
app.use('/api/stocks', stockRoutes);
app.use('/api/web_api', web_apiRoutes); // <-- Add this line
app.use('/api/python', predictionRoutes)
// app.use('/api', (req, res) => {
//   res.json({ message: 'API endpoint is working' });
// });


const server = createServer(app);
app.get('/', (req, res) => {
  res.send('Stock Tracker Server is running');
});
server.listen(PORT, () => {
  console.log('NEWSDATA_API_KEY:', process.env.NEWSDATA_API_KEY); // Confirm key is loaded here

  console.log(`Server is running on port ${PORT}`);
});


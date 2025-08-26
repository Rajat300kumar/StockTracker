import express from 'express';
import { getPrediction } from '../controllers/prediction';

const router = express.Router();
console.log(router)
router.post('/predict', getPrediction);

export default router;

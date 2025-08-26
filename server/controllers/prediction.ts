import { NextFunction, Request, Response } from 'express';
import path from 'path';
import { execFile } from 'child_process';

export const getPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { symbols, range, reportType } = req.body;
        console.log("with python", symbols, range, reportType,)
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ error: "Missing or invalid symbols" });
        }

        const inputData = {
            symbol: symbols[0],
            range,
            reportType
        };

        const pythonPath = path.join(__dirname, '../venv/bin/python');
        const scriptPath = path.join(__dirname, '../ml/predict.py');

        execFile(pythonPath, [scriptPath, JSON.stringify(inputData)], (error, stdout, stderr) => {
            if (error) {
                console.error("Python Error:", stderr);
                return res.status(500).json({ error: 'Prediction failed' });
            }

            try {
                const predictionResult = JSON.parse(stdout);
                return res.json(predictionResult);
            } catch (parseError) {
                console.error("JSON Parse Error:", stdout);
                return res.status(500).json({ error: 'Invalid Python response format' });
            }
        });
    } catch (error) {
        console.error("Sentiment API Error:", error);
        res.status(500).json({ error: "Failed to fetch sentiment data." });

    }
}
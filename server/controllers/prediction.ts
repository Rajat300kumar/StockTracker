import { NextFunction, Request, Response } from 'express';
import path from 'path';
import { execFile } from 'child_process';

export const getPrediction_ = async (req: Request, res: Response, next: NextFunction) => {
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

export const getPrediction = (req: Request, res: Response) => {
  try {
    const { symbols, range, reportType } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: "Missing or invalid symbols" });
    }

    const pythonPath = '/Users/rajatkumar/Desktop/dev-practice/python3.9/venv/bin/python';

    // Use the wrapper script that outputs clean JSON
    const scriptPath = '/Users/rajatkumar/Desktop/dev-practice/python3.9/json_predictor_wrapper.py';

    const inputData = {
      symbol: symbols[0],
      range,
      reportType,
      basePath: '/Users/rajatkumar/Desktop/dev-practice/python3.9'
    };

    console.log('🚀 Input Data for Python Script:', inputData);

    execFile(
      pythonPath,
      [scriptPath, JSON.stringify(inputData)],
      { cwd: '/Users/rajatkumar/Desktop/dev-practice/python3.9' }, // <-- Set working directory here
      (error, stdout, stderr) => {
        console.log('🐍 Python stderr:', stderr.trim());
        console.log('📤 Python stdout (raw):', stdout.trim());

        if (error) {
          console.error('❌ Python execution error:', error);
          return res.status(500).json({ error: 'Prediction script failed to execute.' });
        }

        try {
          const data = JSON.parse(stdout); // safe, stdout is pure JSON
          res.status(200).json({ prediction: data, logs: stderr });
        } catch (parseError) {
          res.status(500).json({ error: 'Invalid JSON from Python output' });
        }
      }
    );

  } catch (error) {
    console.error('❌ Server-side error:', error);
    return res.status(500).json({ error: 'Server error while fetching prediction.' });
  }
};




export const getPrediction___ = (req: Request, res: Response) => {
  try {
    const { symbols, range, reportType } = req.body;
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: "Missing or invalid symbols" });
    }

    const pythonPath = '/Users/rajatkumar/Desktop/dev-practice/python3.9/venv/bin/python';

    const scriptPath = '/Users/rajatkumar/Desktop/dev-practice/python3.9/ml/predict.py';

    const inputData = {
      symbol: symbols[0],
      range,
      reportType,
      basePath: '/Users/rajatkumar/Desktop/dev-practice/python3.9'
    };
    console.log('Input Data for Python Script:', inputData);
    execFile(pythonPath, [scriptPath, JSON.stringify(inputData)], (error, stdout, stderr) => {
      console.log('Python stderr:', stderr);  // should contain logs
      console.log('Python stdout (raw):', JSON.stringify(stdout));  // this should be clean JSON

      if (error) {
        console.error('Python error:', error);
        return res.status(500).json({ error: 'Prediction failed' });
      }

      try {
        const data = JSON.parse(stdout);
        console.log('Parsed prediction data: node', data);
        res.json(data);
      } catch (e) {
        console.error('JSON parse error:', stdout);
        res.status(500).json({ error: 'Invalid JSON from Python' });
      }
    });


    // execFile(pythonPath, [scriptPath, JSON.stringify(inputData)], (error, stdout, stderr) => {
    //   if (error) {
    //     console.error("Python Error:", stderr || error.message);
    //     console.error("Python stdout (debug):", stdout);
    //     return res.status(500).json({ error: "Prediction failed: " + (stderr || error.message) });
    //   }

    //   console.log("Python stdout:", stdout);

    //   try {
    //     const predictionResult = JSON.parse(stdout);
    //     res.json(predictionResult);
    //   } catch (parseError) {
    //     console.error("JSON Parse Error:", stdout);
    //     res.status(500).json({ error: "Invalid Python response format" });
    //   }
    // });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Failed to fetch prediction.' });
  }
};

export const getPrediction__ = async (req: Request, res: Response) => {
  try {
    const { symbols, range, reportType } = req.body;
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: "Missing or invalid symbols" });
    }

    // Build input data, add basePath for Python script to find data/models
    const inputData = {
      symbol: symbols[0],
      range,
      reportType,
      basePath: "/Users/rajatkumar/Desktop/dev-practice/python3.9"
    };

    const pythonPath = path.join(__dirname, '../venv/bin/python');
    const scriptPath = path.join(__dirname, '../ml/predict.py');

    execFile(pythonPath, [scriptPath, JSON.stringify(inputData)], (error, stdout, stderr) => {
      if (error) {
        console.error("Python Error:", stderr);
        return res.status(500).json({ error: "Prediction failed" });
      }

      try {
        const predictionResult = JSON.parse(stdout);
        return res.json(predictionResult);
      } catch (parseError) {
        console.error("JSON Parse Error:", stdout);
        return res.status(500).json({ error: "Invalid Python response format" });
      }
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Failed to fetch prediction." });
  }
};
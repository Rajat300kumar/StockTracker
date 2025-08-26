import { Request, Response } from "express";
import { Router } from 'express';
import path from "path";
import yahooFinance from "yahoo-finance2";
import fs from 'fs';
const router = Router();

const dataFilePath = path.join(__dirname, '../../client/data.json');
router.post('/saveimportcsv', (req: Request, res: Response) => {
    const data = req.body.data; // Assuming the data is sent in the request body
    console.log("Data received for CSV import:", data);
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ message: 'Invalid data format' });
    }
    // Read existing data if file exists
    let existingData: any[] = [];
    if (fs.existsSync(dataFilePath)) {
        const raw = fs.readFileSync(dataFilePath, "utf-8");
        try {
            existingData = JSON.parse(raw);
        } catch (err) {
            console.error("Error parsing existing data.json:", err);
        }
    }
    // Avoid duplicates by checking unique fields (customize this)
    const combinedData = [...existingData];
    const existingSet = new Set(existingData.map((item) => item.SYMBOL));
    console.log("Existing data loaded:", existingData);
    console.log("Existing set created:", existingSet);
    data.forEach((item) => {
        if (!existingSet.has(item.SYMBOL)) {
            combinedData.push(item);
            existingSet.add(item.SYMBOL);
        }
    });


    // Write back to file
    fs.writeFileSync(dataFilePath, JSON.stringify(combinedData, null, 2), "utf-8");

    res.json({
        message: "Done",
        savedCount: combinedData.length - existingData.length,
    });
});
// Route to fetch all stocks data data.json
router.get('/getimportcsv', (req: Request, res: Response) => {
    if (fs.existsSync(dataFilePath)) {
        const raw = fs.readFileSync(dataFilePath, "utf-8");
        try {
            const data = JSON.parse(raw);
            res.json(data);
        } catch (err) {
            console.error("Error parsing data.json:", err);
            res.status(500).json({ message: "Error parsing data file" });
        }
    } else {
        res.status(404).json({ message: "Data file not found" });
    }
});

export const web_apiRoutes = router;
// your route definitions here, for example:
import { Router } from 'express';
import { stockBulkController, stockBulkReportController, stockController, stockmarcketview, } from '../controllers/stockController'; // Make sure this path is correct
import { stockPriceAnalysisControllerbbk } from '../controllers/stockPriceAnalysisController';
import { getSentimentData, getSentimentData_, getSentimentDatagoogle } from '../controllers/sentiments';
import { getCompanyOverview } from '../controllers/companyController';
const router = Router();

router.get('/:symbol', stockController); // 
router.post('/bulk', stockBulkController);
// router.get('/report/:symbol', stockBulkReportController);
// In stockRoutes.ts or stockController.ts
router.post('/report', stockBulkReportController)
router.post('/marketview', stockmarcketview)
// router.post('/anaylisis',stockPriceAnalysisController)
router.post('/anaylisis', stockPriceAnalysisControllerbbk)
// router.post('/sentiments',getSentimentData)
router.post('/sentiments', getSentimentData_)
router.post('/sentimentgoogle', getSentimentDatagoogle)
router.get("/company/:symbol", getCompanyOverview);

// ... route handlers ...

export default router;
import { Request, Response } from 'express';
import yahooFinance from 'yahoo-finance2';
import { SMA, EMA, RSI, MACD } from 'technicalindicators';
import { subDays, startOfYear, format } from 'date-fns';
import { getCompanyIdBySymbol, getLatestIndicatorDate } from '../util/dbUtils';
import pool from '../db/postgres';
import pgFormat from 'pg-format';
// Type for MovingAverages input
type MovingAveragesInput = {
    SMA?: number[];
    EMA?: number[];
    RSI?: number[];
    MACD?: { fast: number; slow: number; signal: number }[];
};

type MA =
    | { type: 'SMA'; period: number }
    | { type: 'EMA'; period: number }
    | { type: 'RSI'; period: number }
    | { type: 'MACD'; fastPeriod: number; slowPeriod: number; signalPeriod: number };

const validPeriods = {
    SMA: [5, 7, 10, 20, 50, 100, 200],
    EMA: [5, 10, 20, 50, 100, 200],
    RSI: [7, 14, 21, 30],
    MACD: [
        { fast: 12, slow: 26, signal: 9 },
        { fast: 5, slow: 13, signal: 9 },
        { fast: 10, slow: 30, signal: 9 },
    ],
};

function flattenMovingAverages(maObj: MovingAveragesInput): string[] {
    const result: string[] = [];

    if (maObj.SMA) {
        result.push(...maObj.SMA.map(period => `SMA${period}`));
    }

    if (maObj.EMA) {
        result.push(...maObj.EMA.map(period => `EMA${period}`));
    }

    if (maObj.RSI) {
        result.push(...maObj.RSI.map(period => `RSI${period}`));
    }

    if (maObj.MACD) {
        result.push(...maObj.MACD.map(({ fast, slow, signal }) => `MACD${fast},${slow},${signal}`));
    }

    return result;
}
function parseMovingAverages(mas: string[]): MA[] {
    return mas.map(ma => {
        const upper = ma.toUpperCase();

        if (upper.startsWith('SMA')) {
            const period = parseInt(ma.slice(3));
            if (!validPeriods.SMA.includes(period)) throw new Error(`Invalid SMA period: ${period}`);
            return { type: 'SMA', period };
        }

        if (upper.startsWith('EMA')) {
            const period = parseInt(ma.slice(3));
            if (!validPeriods.EMA.includes(period)) throw new Error(`Invalid EMA period: ${period}`);
            return { type: 'EMA', period };
        }

        if (upper.startsWith('RSI')) {
            const period = parseInt(ma.slice(3));
            if (!validPeriods.RSI.includes(period)) throw new Error(`Invalid RSI period: ${period}`);
            return { type: 'RSI', period };
        }

        if (upper.startsWith('MACD')) {
            const params = ma.slice(4).split(',').map(p => parseInt(p));
            if (
                !params ||
                params.length !== 3 ||
                !validPeriods.MACD.some(p => p.fast === params[0] && p.slow === params[1] && p.signal === params[2])
            ) {
                throw new Error(`Invalid MACD parameters: ${ma}`);
            }
            const [fastPeriod, slowPeriod, signalPeriod] = params;
            return { type: 'MACD', fastPeriod, slowPeriod, signalPeriod };
        }

        throw new Error(`Unsupported moving average type: ${ma}`);
    });
}

function calculateDateRange(range: string) {
    const today = new Date();
    let startDate: Date;
    const normalizedRange = range.trim().toUpperCase();

    switch (normalizedRange) {
        case '1D':
            startDate = subDays(today, 1);
            break;
        case '5D':
            startDate = subDays(today, 5);
            break;
        case '1W':
            startDate = subDays(today, 7);
            break;
        case '1M':
            startDate = subDays(today, 30);
            break;
        case '6M':
            startDate = subDays(today, 180);
            break;
        case 'YTD':
            startDate = startOfYear(today);
            break;
        case '1Y':
            startDate = subDays(today, 365);
            break;
        case '5Y':
            startDate = subDays(today, 5 * 365);
            break;
        case 'MAX':
            startDate = subDays(today, 10 * 365);
            break;
        default:
            throw new Error('Unsupported range');
    }

    return {
        period1: format(startDate, 'yyyy-MM-dd'),
        period2: format(today, 'yyyy-MM-dd'),
    };
}
function calculateIndicators(mas: MA[], values: number[]) {
    const results: Record<string, any> = {};

    for (const ma of mas) {
        switch (ma.type) {
            case 'SMA':
                results[`SMA${ma.period}`] = SMA.calculate({ period: ma.period, values });
                break;
            case 'EMA':
                results[`EMA${ma.period}`] = EMA.calculate({ period: ma.period, values });
                break;
            case 'RSI':
                results[`RSI${ma.period}`] = RSI.calculate({ period: ma.period, values });
                break;
            case 'MACD':
                results[`MACD${ma.fastPeriod},${ma.slowPeriod},${ma.signalPeriod}`] = MACD.calculate({
                    fastPeriod: ma.fastPeriod,
                    slowPeriod: ma.slowPeriod,
                    signalPeriod: ma.signalPeriod,
                    values,
                    SimpleMAOscillator: false,
                    SimpleMASignal: false,
                });
                break;
        }
    }

    return results;
}

export async function stockPriceAnalysisControllerbbk_org(req: Request, res: Response) {
    try {
        const { symbols, range, reportType, movingAverages }: {
            symbols: string[];
            range: string;
            reportType: 'price' | 'volume' | 'technical';
            movingAverages: MovingAveragesInput;
        } = req.body;

        console.log('Received:', symbols, range, reportType, movingAverages);

        // Validate inputs
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ success: false, error: 'Symbols array is required' });
        }
        if (!range || typeof range !== 'string') {
            return res.status(400).json({ success: false, error: 'Range is required' });
        }
        if (!reportType || typeof reportType !== 'string') {
            return res.status(400).json({ success: false, error: 'reportType is required' });
        }
        if (!movingAverages || typeof movingAverages !== 'object') {
            return res.status(400).json({ success: false, error: 'movingAverages object is required' });
        }

        // Flatten moving averages object into string array for parsing
        const flattenedMAStrings = flattenMovingAverages(movingAverages);
        console.log('Flattened Moving Averages:', flattenedMAStrings);

        // Parse moving averages
        const mas = parseMovingAverages(flattenedMAStrings);
        console.log('Parsed MAs:', mas);

        // Calculate date range
        const { period1, period2 } = calculateDateRange(range);
        console.log('Date range:', period1, period2);

        const symbol = symbols[0];

        const result = await yahooFinance.historical(symbol, {
            period1,
            period2,
            interval: '1d',
        });

        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, error: 'No data returned from Yahoo Finance' });
        }

        let values: number[];
        if (reportType === 'price' || reportType === 'technical') {
            values = result.map(r => r.close).filter(v => v != null) as number[];
        } else if (reportType === 'volume') {
            values = result.map(r => r.volume).filter(v => v != null) as number[];
        } else {
            return res.status(400).json({ success: false, error: `Invalid reportType: ${reportType}` });
        }

        let indicatorResults;
        try {
            indicatorResults = calculateIndicators(mas, values);
            console.log('Indicator results:', indicatorResults);
        } catch (e) {
            console.error('Error calculating indicators:', e);
            return res.status(500).json({ success: false, error: 'Failed calculating indicators' });
        }

        return res.json({
            success: true,
            data: {
                symbol,
                lastUpdated: result[result.length - 1]?.date,
                currentPrice: result[result.length - 1]?.close,
                indicators: indicatorResults,
                historical: result,
            },
        });
    } catch (error: any) {
        console.error('Error in stockPriceAnalysisController:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
}

// export async function stockPriceAnalysisControllerbbk(req: Request, res: Response) {
//     try {
//         const {
//             symbols,
//             range,
//             reportType,
//             movingAverages,
//         }: {
//             symbols: string[];
//             range: string;
//             reportType: 'price' | 'volume' | 'technical';
//             movingAverages: any;
//         } = req.body;

//         if (!symbols || symbols.length === 0 || !range || !reportType || !movingAverages) {
//             return res.status(400).json({ success: false, error: 'Missing required parameters' });
//         }

//         const symbol = symbols[0];
//         const { period1, period2 } = calculateDateRange(range);
//         console.log('Date range:', period1, period2);
//         // Get the latest date for which indicators are already calculated
//         const companyId = await getCompanyIdBySymbol(symbol);
//         if (!companyId) {
//             return res.status(404).json({ success: false, error: 'Company not found in database' });
//         }

//         const result = await yahooFinance.historical(symbol, {
//             period1,
//             period2,
//             interval: '1d',
//         });

//         if (!result || result.length === 0) {
//             return res.status(404).json({ success: false, error: 'No historical data returned' });
//         }

//         // Extract price or volume data as needed
//         const values = result
//             .map((r) => {
//                 if (reportType === 'price' || reportType === 'technical') return r.close;
//                 if (reportType === 'volume') return r.volume;
//                 return null;
//             })
//             .filter((v) => v !== null) as number[];

//         const flattenedMAStrings = flattenMovingAverages(movingAverages);
//         const mas = parseMovingAverages(flattenedMAStrings);

//         const indicatorResults = calculateIndicators(mas, values);

//         // Assuming this is inside an async function or route handler

//         // Log lengths for sanity check
//         // console.log("result length:", result.length);
//         // console.log("indicatorResults keys:", Object.keys(indicatorResults));

//         // Extract indicator arrays for easier access, fallback to empty arrays to avoid errors
//         const sma7Arr = indicatorResults["SMA7"] || [];
//         const sma20Arr = indicatorResults["SMA20"] || [];
//         const sma50Arr = indicatorResults["SMA50"] || [];
//         const ema10Arr = indicatorResults["EMA10"] || [];
//         const ema20Arr = indicatorResults["EMA20"] || [];
//         const ema50Arr = indicatorResults["EMA50"] || [];
//         const ema100Arr = indicatorResults["EMA100"] || [];
//         const rsi7Arr = indicatorResults["RSI7"] || [];
//         const rsi14Arr = indicatorResults["RSI14"] || [];
//         const rsi21Arr = indicatorResults["RSI21"] || [];
//         const rsi30Arr = indicatorResults["RSI30"] || [];
//         const macd12269Arr = indicatorResults["MACD12,26,9"] || [];
//         const macd5139Arr = indicatorResults["MACD5,13,9"] || [];
//         const macd10309Arr = indicatorResults["MACD10,30,9"] || [];

//         for (let i = 0; i < result.length; i++) {
//             const row = result[i];
//             const date = new Date(row.date);
//             console.log(`Processing row ${i} for date ${date}`);

//             if (isNaN(date.getTime())) {
//                 console.warn(`Invalid date at index ${i}, skipping`);
//                 continue;
//             }

//             // Build indicators object for this row (handle undefined with null)
//             const indicators = {
//                 sma7: sma7Arr[i] ?? null,
//                 sma20: sma20Arr[i] ?? null,
//                 sma50: sma50Arr[i] ?? null,
//                 ema10: ema10Arr[i] ?? null,
//                 ema20: ema20Arr[i] ?? null,
//                 ema50: ema50Arr[i] ?? null,
//                 ema100: ema100Arr[i] ?? null,
//                 rsi7: rsi7Arr[i] ?? null,
//                 rsi14: rsi14Arr[i] ?? null,
//                 rsi21: rsi21Arr[i] ?? null,
//                 rsi30: rsi30Arr[i] ?? null,
//                 macd_12_26_9: macd12269Arr[i]?.MACD ?? null,
//                 macd_signal_12_26_9: macd12269Arr[i]?.signal ?? null,
//                 macd_histogram_12_26_9: macd12269Arr[i]?.histogram ?? null,
//                 macd_5_13_9: macd5139Arr[i]?.MACD ?? null,
//                 macd_signal_5_13_9: macd5139Arr[i]?.signal ?? null,
//                 macd_histogram_5_13_9: macd5139Arr[i]?.histogram ?? null,
//                 macd_10_30_9: macd10309Arr[i]?.MACD ?? null,
//                 macd_signal_10_30_9: macd10309Arr[i]?.signal ?? null,
//                 macd_histogram_10_30_9: macd10309Arr[i]?.histogram ?? null,
//             };

//             // // Optional: skip if *all* indicators are null (you can remove if you want to insert anyway)
//             // if (Object.values(indicators).every(val => val === null)) {
//             //     console.warn(`No indicators found for index ${i}, skipping insert`);
//             //     continue;
//             // }

//             try {
//                 await pool.query(
//                     `INSERT INTO technical_indicators (
//         company_id, date,
//         sma7, sma20, sma50,
//         ema10, ema20, ema50, ema100,
//         rsi7, rsi14, rsi21, rsi30,
//         macd_12_26_9, macd_signal_12_26_9, macd_histogram_12_26_9,
//         macd_5_13_9, macd_signal_5_13_9, macd_histogram_5_13_9,
//         macd_10_30_9, macd_signal_10_30_9, macd_histogram_10_30_9,
//         open, high, low, close, volume
//       ) VALUES (
//         $1, $2,
//         $3, $4, $5,
//         $6, $7, $8, $9,
//         $10, $11, $12, $13,
//         $14, $15, $16,
//         $17, $18, $19,
//         $20, $21, $22,
//         $23, $24, $25, $26, $27
//       )
//       ON CONFLICT (company_id, date) DO UPDATE SET
//         sma7 = COALESCE(EXCLUDED.sma7, technical_indicators.sma7),
//         sma20 = COALESCE(EXCLUDED.sma20, technical_indicators.sma20),
//         sma50 = COALESCE(EXCLUDED.sma50, technical_indicators.sma50),
//         ema10 = COALESCE(EXCLUDED.ema10, technical_indicators.ema10),
//         ema20 = COALESCE(EXCLUDED.ema20, technical_indicators.ema20),
//         ema50 = COALESCE(EXCLUDED.ema50, technical_indicators.ema50),
//         ema100 = COALESCE(EXCLUDED.ema100, technical_indicators.ema100),
//         rsi7 = COALESCE(EXCLUDED.rsi7, technical_indicators.rsi7),
//         rsi14 = COALESCE(EXCLUDED.rsi14, technical_indicators.rsi14),
//         rsi21 = COALESCE(EXCLUDED.rsi21, technical_indicators.rsi21),
//         rsi30 = COALESCE(EXCLUDED.rsi30, technical_indicators.rsi30),
//         macd_12_26_9 = COALESCE(EXCLUDED.macd_12_26_9, technical_indicators.macd_12_26_9),
//         macd_signal_12_26_9 = COALESCE(EXCLUDED.macd_signal_12_26_9, technical_indicators.macd_signal_12_26_9),
//         macd_histogram_12_26_9 = COALESCE(EXCLUDED.macd_histogram_12_26_9, technical_indicators.macd_histogram_12_26_9),
//         macd_5_13_9 = COALESCE(EXCLUDED.macd_5_13_9, technical_indicators.macd_5_13_9),
//         macd_signal_5_13_9 = COALESCE(EXCLUDED.macd_signal_5_13_9, technical_indicators.macd_signal_5_13_9),
//         macd_histogram_5_13_9 = COALESCE(EXCLUDED.macd_histogram_5_13_9, technical_indicators.macd_histogram_5_13_9),
//         macd_10_30_9 = COALESCE(EXCLUDED.macd_10_30_9, technical_indicators.macd_10_30_9),
//         macd_signal_10_30_9 = COALESCE(EXCLUDED.macd_signal_10_30_9, technical_indicators.macd_signal_10_30_9),
//         macd_histogram_10_30_9 = COALESCE(EXCLUDED.macd_histogram_10_30_9, technical_indicators.macd_histogram_10_30_9),
//         open = COALESCE(EXCLUDED.open, technical_indicators.open),
//         high = COALESCE(EXCLUDED.high, technical_indicators.high),
//         low = COALESCE(EXCLUDED.low, technical_indicators.low),
//         close = COALESCE(EXCLUDED.close, technical_indicators.close),
//         volume = COALESCE(EXCLUDED.volume, technical_indicators.volume)
//       `,
//                     [
//                         companyId, date,
//                         indicators.sma7, indicators.sma20, indicators.sma50,
//                         indicators.ema10, indicators.ema20, indicators.ema50, indicators.ema100,
//                         indicators.rsi7, indicators.rsi14, indicators.rsi21, indicators.rsi30,
//                         indicators.macd_12_26_9, indicators.macd_signal_12_26_9, indicators.macd_histogram_12_26_9,
//                         indicators.macd_5_13_9, indicators.macd_signal_5_13_9, indicators.macd_histogram_5_13_9,
//                         indicators.macd_10_30_9, indicators.macd_signal_10_30_9, indicators.macd_histogram_10_30_9,
//                         row.open, row.high, row.low, row.close, row.volume,
//                     ]
//                 );
//             } catch (error) {
//                 console.error(`Error inserting row ${i} for date ${date}:`, error);
//             }
//         }

//         // After insertions, return your original response unchanged
//         return res.json({
//             success: true,
//             data: {
//                 symbol,
//                 lastUpdated: result[result.length - 1]?.date,
//                 currentPrice: result[result.length - 1]?.close,
//                 indicators: indicatorResults,
//                 historical: result,
//             },
//         });


//     } catch (error: any) {
//         console.error('Error in stockPriceAnalysisController:', error);
//         return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
//     }
// }
function averageClose(history: any[], index: number, period: number): number {
    if (index < period) return NaN;

    const slice = history.slice(index - period, index);
    const valid = slice.filter(d => d?.close != null);

    const sum = valid.reduce((acc, day) => acc + day.close, 0);
    return valid.length ? sum / valid.length : NaN;
}

function calculateRSIDivergence(ind: any, history: any[], i: number): string {
    const rsiSeries =
        ind.RSI7 || ind.RSI14 || ind.RSI21 || ind.RSI30 || [];

    if (i < 1 || !rsiSeries[i] || !rsiSeries[i - 1] || !history[i] || !history[i - 1]) {
        return 'None';
    }

    const rsiToday = rsiSeries[i];
    const rsiPrev = rsiSeries[i - 1];
    const priceToday = history[i].close;
    const pricePrev = history[i - 1].close;

    const rsiChangeThreshold = 2;       // Ignore small changes
    const priceChangeThreshold = 0.5;   // %

    const rsiChange = rsiToday - rsiPrev;
    const priceChange = priceToday - pricePrev;
    const priceChangePercent = (priceChange / pricePrev) * 100;

    if (Math.abs(rsiChange) < rsiChangeThreshold || Math.abs(priceChangePercent) < priceChangeThreshold) {
        return 'None';
    }

    if (rsiChange < 0 && priceChange > 0) return 'Bullish Divergence';
    if (rsiChange > 0 && priceChange < 0) return 'Bearish Divergence';

    return 'None';
}
function safeDivide(numerator: number, denominator: number): number | null {
    return denominator === 0 ? null : numerator / denominator;
}

export async function stockPriceAnalysisControllerbbk(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const {
            symbols,
            range,
            reportType,
            movingAverages,
        }: {
            symbols: string[];
            range: string;
            reportType: 'price' | 'volume' | 'technical';
            movingAverages: any;
        } = req.body;

        if (!symbols?.length || !range || !reportType || !movingAverages) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }

        const symbol = symbols[0];
        const { period1, period2 } = calculateDateRange(range);
        const companyId = await getCompanyIdBySymbol(symbol);
        if (!companyId) {
            return res.status(404).json({ success: false, error: 'Company not found in database' });
        }

        const history = await yahooFinance.historical(symbol, {
            period1,
            period2,
            interval: '1d',
        });

        if (!history?.length) {
            return res.status(404).json({ success: false, error: 'No historical data returned' });
        }

        // Prepare indicator arrays
        const values = history.map(r =>
            reportType === 'volume' ? r.volume : r.close
        ) as number[];

        const mas = parseMovingAverages(flattenMovingAverages(movingAverages));
        const indicatorResults = calculateIndicators(mas, values);

        // Use full history length instead of truncating to indicator array length
        const rows: any[] = [];
        for (let i = 0; i < history.length; i++) {
            const r = history[i];
            const date = new Date(r.date);
            if (isNaN(date.getTime())) continue;

            const ind = indicatorResults;
            // Custom indicator calculations
            const close = r.close;
            const open = r.open;

            const avgClose = i >= 5 ? averageClose(history, i, 5) : null;
            const relativeStrength = avgClose ? safeDivide(close - avgClose, avgClose) : null;
            const pastClose = i >= 5 ? history[i - 5].close : null;
            const momentumScore = pastClose ? safeDivide(close - pastClose, pastClose) : null;
            const stockPerformance = close > open ? 'Positive' : close < open ? 'Negative' : 'Neutral';
            const rsiDivergence = calculateRSIDivergence(ind, history, i);
            rows.push([
                companyId,
                date,
                ind.SMA7?.[i] ?? null,
                ind.SMA20?.[i] ?? null,
                ind.SMA50?.[i] ?? null,
                ind.EMA10?.[i] ?? null,
                ind.EMA20?.[i] ?? null,
                ind.EMA50?.[i] ?? null,
                ind.EMA100?.[i] ?? null,
                ind.RSI7?.[i] ?? null,
                ind.RSI14?.[i] ?? null,
                ind.RSI21?.[i] ?? null,
                ind.RSI30?.[i] ?? null,
                ind['MACD12,26,9']?.[i]?.MACD ?? null,
                ind['MACD12,26,9']?.[i]?.signal ?? null,
                ind['MACD12,26,9']?.[i]?.histogram ?? null,
                ind['MACD5,13,9']?.[i]?.MACD ?? null,
                ind['MACD5,13,9']?.[i]?.signal ?? null,
                ind['MACD5,13,9']?.[i]?.histogram ?? null,
                ind['MACD10,30,9']?.[i]?.MACD ?? null,
                ind['MACD10,30,9']?.[i]?.signal ?? null,
                ind['MACD10,30,9']?.[i]?.histogram ?? null,
                r.open,
                r.high,
                r.low,
                r.close,
                r.volume,
                relativeStrength,
                momentumScore,
                stockPerformance,
                rsiDivergence
            ]);
        }

        if (!rows.length) {
            await client.release();
            return res.status(200).json({ success: true, data: { symbol, message: 'No valid rows to insert' } });
        }

        // Batch insert
        await client.query('BEGIN');
        const sql = pgFormat(
            `INSERT INTO technical_indicators (
        company_id, date,
        sma7, sma20, sma50,
        ema10, ema20, ema50, ema100,
        rsi7, rsi14, rsi21, rsi30,
        macd_12_26_9, macd_signal_12_26_9, macd_histogram_12_26_9,
        macd_5_13_9, macd_signal_5_13_9, macd_histogram_5_13_9,
        macd_10_30_9, macd_signal_10_30_9, macd_histogram_10_30_9,
        open, high, low, close, volume,
        relative_strength, momentum_score, stock_performance, rsi_divergence
      ) VALUES %L
      ON CONFLICT (company_id, date) DO UPDATE SET
        sma7 = COALESCE(EXCLUDED.sma7, technical_indicators.sma7),
        sma20 = COALESCE(EXCLUDED.sma20, technical_indicators.sma20),
        sma50 = COALESCE(EXCLUDED.sma50, technical_indicators.sma50),
        ema10 = COALESCE(EXCLUDED.ema10, technical_indicators.ema10),
        ema20 = COALESCE(EXCLUDED.ema20, technical_indicators.ema20),
        ema50 = COALESCE(EXCLUDED.ema50, technical_indicators.ema50),
        ema100 = COALESCE(EXCLUDED.ema100, technical_indicators.ema100),
        rsi7 = COALESCE(EXCLUDED.rsi7, technical_indicators.rsi7),
        rsi14 = COALESCE(EXCLUDED.rsi14, technical_indicators.rsi14),
        rsi21 = COALESCE(EXCLUDED.rsi21, technical_indicators.rsi21),
        rsi30 = COALESCE(EXCLUDED.rsi30, technical_indicators.rsi30),
        macd_12_26_9 = COALESCE(EXCLUDED.macd_12_26_9, technical_indicators.macd_12_26_9),
        macd_signal_12_26_9 = COALESCE(EXCLUDED.macd_signal_12_26_9, technical_indicators.macd_signal_12_26_9),
        macd_histogram_12_26_9 = COALESCE(EXCLUDED.macd_histogram_12_26_9, technical_indicators.macd_histogram_12_26_9),
        macd_5_13_9 = COALESCE(EXCLUDED.macd_5_13_9, technical_indicators.macd_5_13_9),
        macd_signal_5_13_9 = COALESCE(EXCLUDED.macd_signal_5_13_9, technical_indicators.macd_signal_5_13_9),
        macd_histogram_5_13_9 = COALESCE(EXCLUDED.macd_histogram_5_13_9, technical_indicators.macd_histogram_5_13_9),
        macd_10_30_9 = COALESCE(EXCLUDED.macd_10_30_9, technical_indicators.macd_10_30_9),
        macd_signal_10_30_9 = COALESCE(EXCLUDED.macd_signal_10_30_9, technical_indicators.macd_signal_10_30_9),
        macd_histogram_10_30_9 = COALESCE(EXCLUDED.macd_histogram_10_30_9, technical_indicators.macd_histogram_10_30_9),
        open = COALESCE(EXCLUDED.open, technical_indicators.open),
        high = COALESCE(EXCLUDED.high, technical_indicators.high),
        low = COALESCE(EXCLUDED.low, technical_indicators.low),
        close = COALESCE(EXCLUDED.close, technical_indicators.close),
        volume = COALESCE(EXCLUDED.volume, technical_indicators.volume),
        relative_strength = COALESCE(EXCLUDED.relative_strength, technical_indicators.relative_strength),
        momentum_score = COALESCE(EXCLUDED.momentum_score, technical_indicators.momentum_score),
        stock_performance = COALESCE(EXCLUDED.stock_performance, technical_indicators.stock_performance),
        rsi_divergence = COALESCE(EXCLUDED.rsi_divergence, technical_indicators.rsi_divergence)
      `,
            rows
        );
        await client.query(sql);
        await client.query('COMMIT');

        return res.json({
            success: true,
            data: {
                symbol,
                lastUpdated: history[history.length - 1].date,
                currentPrice: history[history.length - 1].close,
                indicators: indicatorResults,
                historical: history,
            },
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error in stockPriceAnalysisController:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    } finally {
        client.release();
    }
}





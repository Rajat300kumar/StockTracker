import { Request, Response } from 'express';
import yahooFinance from 'yahoo-finance2';
import { SMA, EMA, RSI, MACD } from 'technicalindicators';
import { subDays, startOfYear, format } from 'date-fns';

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
            startDate = subDays(today, 100 * 365);
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

export async function stockPriceAnalysisControllerbbk(req: Request, res: Response) {
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



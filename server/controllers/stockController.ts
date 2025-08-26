import { Request, Response, NextFunction } from "express";
import { Router } from 'express';
import { SMA, EMA, RSI, MACD } from "technicalindicators";
import yahooFinance from "yahoo-finance2";


export function calculatePeriodFromRange(
  range: string,
  reportType: string
): {
  period1: Date;
  period2: Date;
  interval: "1d" | "1wk" | "1mo";
} {
  const period2 = new Date(); // Today
  const period1 = new Date(); // Will be modified

  let interval: "1d" | "1wk" | "1mo" = "1d"; // Default

  const normalizedRange = range.trim().toUpperCase();

  switch (normalizedRange) {
    case "1 D":
      period1.setDate(period2.getDate() - 2); // 2 days for buffer
      break;
    case "5 D":
      period1.setDate(period2.getDate() - 7); // Include weekends/holidays
      break;
    case "1 M":
      period1.setMonth(period2.getMonth() - 1);
      break;
    case "6 M":
      period1.setMonth(period2.getMonth() - 6);
      break;
    case "YTD": {
      const startOfYear = new Date(period2.getFullYear(), 0, 1);
      period1.setTime(startOfYear.getTime());
      break;
    }
    case "1 Y":
      period1.setFullYear(period2.getFullYear() - 1);
      break;
    case "5 Y":
      period1.setFullYear(period2.getFullYear() - 5);
      break;
    case "MAX":
      period1.setFullYear(period2.getFullYear() - 20); // Max: 20 years
      break;
    default:
      period1.setFullYear(period2.getFullYear() - 1);
  }

  // Smart interval based on reportType or duration
  switch (reportType.toLowerCase()) {
    case "day":
      interval = "1d";
      break;
    case "monthly":
      interval = normalizedRange === "1 D" || normalizedRange === "5 D" ? "1d" : "1mo";
      break;
    case "year":
      interval = "1mo";
      break;
    default:
      interval = "1d";
  }

  return { period1, period2, interval };
}

export function calculatePeriodFromRange_(range: string, reportType: string) {
  const now = new Date();

  // 🛠️ Subtract 1 full day from now to avoid requesting future data
  const period2 = new Date();
  period2.setDate(now.getDate() - 1);
  period2.setHours(0, 0, 0, 0); // ⏱️ Set to start of day

  // Clone period2 to get period1, modify based on range
  const period1 = new Date(period2);

  const normalizedRange = range.trim().toUpperCase();
  switch (normalizedRange) {
    case "1D":
      period1.setDate(period2.getDate() - 2);
      break;
    case "5D":
      period1.setDate(period2.getDate() - 7);
      break;
    case "1WK":
    case "1W":
      period1.setDate(period2.getDate() - 7);
      break;
    case "1M":
      period1.setMonth(period2.getMonth() - 1);
      break;
    case "6M":
      period1.setMonth(period2.getMonth() - 6);
      break;
    case "YTD":
      period1.setFullYear(period2.getFullYear(), 0, 1); // January 1st this year
      break;
    case "1Y":
      period1.setFullYear(period2.getFullYear() - 1);
      break;
    case "5Y":
      period1.setFullYear(period2.getFullYear() - 5);
      break;
    case "MAX":
      period1.setFullYear(period2.getFullYear() - 20);
      break;
    default:
      period1.setFullYear(period2.getFullYear() - 1); // fallback to 1Y
  }

  // 📉 Decide interval based on reportType
  let interval: "1d" | "1wk" | "1mo" = "1d";
  switch (reportType.toLowerCase()) {
    case "daily":
    case "price":
    case "volume":
      interval = "1d";
      break;
    case "monthly":
      interval = normalizedRange === "1D" || normalizedRange === "5D" ? "1d" : "1mo";
      break;
    case "year":
      interval = "1mo";
      break;
    case "technical":
      interval = "1d"; // SMA/EMA needs finer granularity
      break;
    default:
      interval = "1d";
  }

  console.log(`📆 Range: ${normalizedRange} | From: ${period1.toISOString()} | To: ${period2.toISOString()} | Interval: ${interval}`);

  return { period1, period2, interval };
}







export const stockController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;
    const result = await yahooFinance.quote(symbol);
    res.json(result);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
    next(error);

  }
}
export const stockBulkController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbols = req.body.symbols; // Expecting an array of symbols in the request body
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Invalid symbols array' });
    }
    const results = await yahooFinance.quote(symbols);
    const quotes = Array.isArray(results) ? results : [results];
    var firstQuote = quotes[0];
    if (!firstQuote || !firstQuote.symbol) {
      return res.status(404).json({ error: 'No stock data found for the provided symbols' });
    }
    const columnDefs = Object.keys(firstQuote).map(key => ({
      field: key,
      headerName: key
    }));
    res.json({
      columnDefs: columnDefs,
      rowData: quotes
    });
  } catch (error) {
    console.error('Error fetching bulk stock data:', error);
    res.status(500).json({ error: 'Failed to fetch bulk stock data' });
    next(error);
  }
}
// POST /api/stocks/report
// Body: { symbols: ['AAP', 'AMZN'], range: '1y', interval: '1mo' }


export const stockBulkReportController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol, range, reportType } = req.body; // Now matches new frontend
    console.log(">>", symbol, range, reportType)
    if (!symbol || !Array.isArray(symbol)) {
      return res.status(400).json({ error: 'Missing or invalid symbol array' });
    }

    const { period1, period2, interval } = calculatePeriodFromRange(range, reportType); // <- optional enhancement

    const results: any[] = [];

    for (const sym of symbol) {
      // ✅ Fetch current quote data without modules
      // ✅ Fetch quote for single symbol
      const quote = await yahooFinance.quote(sym) as {
        regularMarketPrice?: number;
        currency?: string;
        [key: string]: any;
      };

      const currentPrice = quote.regularMarketPrice ?? null;
      const currency = quote.currency ?? null;

      // const currentPrice = quote?.regularMarketPrice ?? null;
      // const currency = quote?.financialCurrency ?? null;

      const historicalData = await yahooFinance.historical(sym, {
        period1,
        period2,
        interval
      });

      results.push({
        symbol: sym,
        range,
        interval,
        period1: period1.toISOString(),
        period2: period2.toISOString(),
        currentPrice,
        currency,
        data: historicalData
      });
    }

    res.json({ message: 'Done', data: results });
  } catch (error) {
    console.error('Error fetching stock report:', error);
    res.status(500).json({ error: 'Failed to fetch stock report' });
    next(error);
  }
};
export const stockmarcketview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { region, count, action } = req.body;
    console.log(region, count, action)
    const validActions = [
      'day_gainers',
      'day_losers',
      'most_actives',
      'undervalued_growth_stocks',
      'aggressive_small_caps',
      'undervalued_large_caps',
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }


    // ✅ Bind here, inside the controller
    const screener = yahooFinance.screener.bind(yahooFinance);

    const result = await screener({
      scrIds: action,
      region,
      count,
    });


    return res.status(200).json({
      region,
      action,
      data: result,
    });
  } catch (error) {
    console.error('Error in stockBulkReportController:', error);
    res.status(500).json({ error: 'Failed to fetch stock report' });
    next(error);
  }
};

export const stockPriceAnalysisController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results: any[] = [];
    const { symbols, range, reportType, movingAverages = [14] } = req.body;
    console.log(symbols, range, reportType, movingAverages)
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Missing or invalid symbols array' });
    }

    const normalizedRange = range.replace(/\s+/g, '').toUpperCase();
    console.log(normalizedRange)
    const { period1, period2, interval } = calculatePeriodFromRange_(normalizedRange, reportType);
    const period1Unix = Math.floor(period1.getTime() / 1000);
    const period2Unix = Math.floor(period2.getTime() / 1000);

    for (const sym of symbols) {
      console.log(`Fetching chart for: ${sym}, From: ${period1.toISOString()}, To: ${period2.toISOString()}, Interval: ${interval}`);

      const chartData = await yahooFinance.chart(sym, {
        period1: period1Unix,
        period2: period2Unix,
        interval,
      }) as any;

      if (!chartData || !chartData.indicators?.quote?.length) {
        console.warn(`⚠️ No chart data found for ${sym}`);
        continue;
      }

      const timestamps = chartData.timestamp.map((ts: number) => new Date(ts * 1000)) as any;
      const closePrices = chartData.indicators.quote[0]?.close || [];
      const volumes = chartData.indicators.quote[0]?.volume || [];

      const entry: any = {
        symbol: sym,
        range: normalizedRange,
        interval,
        timestamps
      };

      // PRICE ANALYSIS
      if (reportType === 'price') {
        entry.price = timestamps.map((time: any, i: string | number) => ({
          time,
          value: closePrices[i]
        }));

        for (const period of movingAverages) {
          const sma = SMA.calculate({ period, values: closePrices });
          const ema = EMA.calculate({ period, values: closePrices });
          const offset = closePrices.length - sma.length;

          entry[`SMA(${period})`] = timestamps.slice(offset).map((time: any, i: number) => ({
            time,
            value: sma[i]
          }));

          entry[`EMA(${period})`] = timestamps.slice(offset).map((time: any, i: number) => ({
            time,
            value: ema[i]
          }));
        }
      }

      // VOLUME ANALYSIS
      else if (reportType === 'volume') {
        entry.volume = timestamps.map((time: any, i: string | number) => ({
          time,
          value: volumes[i]
        }));

        for (const period of movingAverages) {
          const volumeAvg = SMA.calculate({ period, values: volumes });
          const offset = volumes.length - volumeAvg.length;

          entry[`VolumeAvg(${period})`] = timestamps.slice(offset).map((time: any, i: number) => ({
            time,
            value: volumeAvg[i]
          }));
        }
      }

      // TECHNICAL INDICATORS
      else if (reportType === 'technical') {
        const rsi = RSI.calculate({ values: closePrices, period: 14 });
        const macd = MACD.calculate({ values: closePrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });

        const offset = closePrices.length - rsi.length;

        entry.RSI = timestamps.slice(offset).map((time: any, i: number) => ({
          time,
          value: rsi[i]
        }));

        entry.MACD = macd.map((val: any, i: number) => ({
          time: timestamps[i + (timestamps.length - macd.length)],
          ...val
        }));
      }

      else {
        return res.status(400).json({ error: 'Invalid reportType' });
      }

      results.push(entry);
    }

    res.json(results);

  } catch (error) {
    console.error('❌ Error in stockPriceAnalysisController:', error);
    res.status(500).json({ error: 'Failed to perform stock analysis' });
    next(error);
  }
};




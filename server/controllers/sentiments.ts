import axios from "axios";
import { subDays, startOfYear } from "date-fns";
import { format } from 'date-fns';
import { Request, Response, NextFunction } from "express";
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

import { parseStringPromise } from 'xml2js';
import pool from '../db/postgres'; // instead of from './db'


import puppeteer from "puppeteer";
import { getOrCreateCompanyId } from "../util/dbUtils";
// replace your fetch calls with this fetch

// Then use fetch as usual

const Sentiment = require('sentiment');
const sentiment = new Sentiment();



const NEWS_API_KEY = process.env.NEWSDATA_API_KEY // Load from .env
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY // Load from .env

function calculateDateRange(range: string) {
    const today = new Date();
    let startDate: Date;
    const normalizedRange = range.trim().toUpperCase();

    switch (normalizedRange) {
        case '1D': startDate = subDays(today, 1); break;
        case '5D': startDate = subDays(today, 5); break;
        case '1W': startDate = subDays(today, 7); break;
        case '1M': startDate = subDays(today, 30); break;
        case '6M': startDate = subDays(today, 180); break;
        case 'YTD': startDate = startOfYear(today); break;
        case '1Y': startDate = subDays(today, 365); break;
        case '5Y': startDate = subDays(today, 5 * 365); break;
        case 'MAX': startDate = subDays(today, 100 * 365); break;
        default: throw new Error('Unsupported range');
    }

    return {
        period1: format(startDate, 'yyyy-MM-dd'),
        period2: format(today, 'yyyy-MM-dd'),
    };
}

export const getSentimentData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { symbols, range, reportType } = req.body;
        console.log("with sentiment", symbols, range, reportType, NEWS_API_KEY)
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ error: "Missing or invalid symbols" });
        }

        const { period1, period2 } = calculateDateRange(range);
        const symbol = symbols[0];
        const apiUrl = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=${encodeURIComponent(symbol)}&language=en`;
        //const apiUrl = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=${encodeURIComponent(symbol)}&language=en&from_date=${period1}&to_date=${period2}`;

        const response = await fetch(apiUrl);
        const data = await response.json();
        const rawArticles = data?.results;

        if (!Array.isArray(rawArticles)) {
            return res.status(400).json({
                error: "Invalid or missing articles from API.",
                raw: data,
            });
        }
        // Convert date strings to Date objects for filtering
        const fromDate = new Date(period1);
        const toDate = new Date(period2);

        // Filter articles by pubDate falling inside [fromDate, toDate]
        const filteredArticles = rawArticles.filter((article: any) => {
            if (!article.pubDate) return false; // skip if no date
            const pubDate = new Date(article.pubDate);
            return pubDate >= fromDate && pubDate <= toDate;
        });

        // ✅ Safe to proceed
        const analyzedArticles = rawArticles.map((article: any) => {
            const text = `${article.title || ''} ${article.description || ''}`;
            const analysis = sentiment.analyze(text);

            return {
                title: article.title,
                description: article.description,
                source: article.source_id,
                link: article.link,
                sentiment: {
                    score: analysis.score,
                    comparative: analysis.comparative,
                    positive: analysis.positive,
                    negative: analysis.negative
                }
            };
        });


        // 🧮 Calculate summary score
        const totalScore = analyzedArticles.reduce((sum: any, a: { sentiment: { score: any; }; }) => sum + a.sentiment.score, 0);
        const overallSentimentScore = analyzedArticles.length ? totalScore / analyzedArticles.length : 0;
        console.log("totalScore", totalScore)
        console.log("overallSentimentScore", overallSentimentScore)
        res.json({
            symbol,
            range,
            from: period1,
            to: period2,
            total: analyzedArticles.length,
            overallSentimentScore,
            articles: analyzedArticles
        });

    } catch (error) {
        console.error("Sentiment API Error:", error);
        res.status(500).json({ error: "Failed to fetch sentiment data." });
    }
}

export const getSentimentData_original = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { symbols, range } = req.body;
        console.log("Fetching sentiment from RSS", symbols, range);

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ error: "Missing or invalid symbols" });
        }

        const symbol = symbols[0];  // Only using first symbol
        const { period1, period2 } = calculateDateRange(range);

        const query = encodeURIComponent(symbol);  // e.g., ADANIPOWER.NS
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
        const xmlResponse = await fetch(rssUrl);
        const xmlText = await xmlResponse.text();

        const parsed = await parseStringPromise(xmlText);
        const articles = parsed.rss?.channel?.[0]?.item || [];

        const sentiment = new Sentiment();

        const filteredArticles = articles.filter((item: any) => {
            const pubDate = new Date(item.pubDate?.[0]);
            return pubDate >= new Date(period1) && pubDate <= new Date(period2);

        });

        // Sentiment analysis
        const analyzedArticles = filteredArticles.map((item: any) => {
            const title = item.title?.[0] || '';
            const description = item.description?.[0] || '';
            const link = item.link?.[0] || '';
            const pubDate = item.pubDate?.[0] || '';

            const text = `${title} ${description}`;
            const analysis = sentiment.analyze(text);

            return {
                title,
                description,
                link,
                pubDate,
                sentiment: {
                    score: analysis.score,
                    comparative: analysis.comparative,
                    positive: analysis.positive,
                    negative: analysis.negative
                }
            };
        });

        const totalScore = analyzedArticles.reduce((sum: any, a: { sentiment: { score: any; }; }) => sum + a.sentiment.score, 0);
        const overallSentimentScore = analyzedArticles.length
            ? totalScore / analyzedArticles.length
            : 0;

        res.json({
            symbol,
            range,
            from: period1,
            to: period2,
            total: analyzedArticles.length,
            overallSentimentScore,
            articles: analyzedArticles
        });

    } catch (error) {
        console.error("RSS Sentiment Error:", error);
        res.status(500).json({ error: "Failed to fetch sentiment from RSS." });
    }

};
export const getSentimentDatagoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { symbols, range } = req.body;
        console.log("Fetching sentiment from Google News HTML", symbols, range);

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ error: "Missing or invalid symbols" });
        }

        const symbol = symbols[0];  // Only using first symbol
        const { period1, period2 } = calculateDateRange(range); // Your helper fn

        // ✅ UPDATED: Google Search News URL with date range
        const gnewsUrl = `https://www.google.com/search?q=${encodeURIComponent(symbol)}+after:${period1}+before:${period2}&tbm=nws&hl=en-IN&gl=IN&ceid=IN:en`;
        console.log(gnewsUrl)
        // Fetch HTML from Google News
        const { data: html } = await axios.get(gnewsUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        // Parse HTML and extract articles
        const $ = cheerio.load(html);
        const sentiment = new Sentiment();
        const analyzedArticles: any[] = [];
        $("div.dbsr").each((_, el) => {
            console.log("_, el", _, el)
            const title = $(el).find("div[role='heading']").text().trim();
            const link = $(el).find("a").attr("href") || "";
            const source = $(el).find(".NUnG9d span").first().text().trim();
            const timeAgo = $(el).find(".WG9SHc span").last().text().trim();
            const description = ""; // Google News search doesn't always show desc

            if (title) {
                const text = `${title} ${description}`;
                const analysis = sentiment.analyze(text);

                analyzedArticles.push({
                    title,
                    description,
                    source,
                    link,
                    pubDate: timeAgo,
                    sentiment: {
                        score: analysis.score,
                        comparative: analysis.comparative,
                        positive: analysis.positive,
                        negative: analysis.negative
                    }
                });
            }
        });

        const totalScore = analyzedArticles.reduce(
            (sum, a) => sum + a.sentiment.score,
            0
        );

        const overallSentimentScore = analyzedArticles.length
            ? totalScore / analyzedArticles.length
            : 0;

        res.json({
            symbol,
            range,
            from: period1,
            to: period2,
            total: analyzedArticles.length,
            overallSentimentScore,
            articles: analyzedArticles
        });

    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message || "Error fetching sentiment" });
    }

}
export const getSentimentData_ = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { symbols, range } = req.body;
        console.log("Fetching sentiment from RSS", symbols, range);

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ error: "Missing or invalid symbols" });
        }

        const symbol = symbols[0]; // e.g., "TCS.NS"
        const { period1, period2 } = calculateDateRange(range);
        // ✅ 🔽 This replaces your old SELECT/IF logic  
        // Fetch company_id from companies table
        const companyId = await getOrCreateCompanyId(symbol);
        console.log("companyId", companyId)
        // const companyId = companyResult.rows[0].id;

        // Fetch RSS feed
        const query = encodeURIComponent(symbol);
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
        const xmlResponse = await fetch(rssUrl);
        const xmlText = await xmlResponse.text();
        const parsed = await parseStringPromise(xmlText);

        const articles = parsed.rss?.channel?.[0]?.item || [];

        const sentiment = new Sentiment();

        const filteredArticles = articles.filter((item: any) => {
            const pubDate = new Date(item.pubDate?.[0]);
            return pubDate >= new Date(period1) && pubDate <= new Date(period2);
        });

        const analyzedArticles = [];

        for (const item of filteredArticles) {
            const title = item.title?.[0] || '';
            const description = item.description?.[0] || '';
            const link = item.link?.[0] || '';
            const pubDateRaw = item.pubDate?.[0] || '';
            const publishedAt = new Date(pubDateRaw);

            const text = `${title} ${description}`;
            const analysis = sentiment.analyze(text);

            // Insert into DB (avoid duplicates using ON CONFLICT)
            try {
                await pool.query(
                    `INSERT INTO sentiments (
                        company_id, article_title, article_description,
                        published_at, sentiment_score, sentiment_comparative,
                        sentiment_positive, sentiment_negative
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (company_id, article_link) DO NOTHING`,
                    [
                        companyId,
                        title,
                        description,
                        publishedAt,
                        analysis.score,
                        analysis.comparative,
                        analysis.positive,
                        analysis.negative
                    ]
                );
            } catch (dbErr) {
                console.error('DB Insert Error for sentiment:', dbErr);
            }

            // Push to response array
            analyzedArticles.push({
                title,
                description,
                link,
                pubDate: publishedAt,
                sentiment: {
                    score: analysis.score,
                    comparative: analysis.comparative,
                    positive: analysis.positive,
                    negative: analysis.negative
                }
            });
        }

        const totalScore = analyzedArticles.reduce((sum, a) => sum + a.sentiment.score, 0);
        const overallSentimentScore = analyzedArticles.length
            ? totalScore / analyzedArticles.length
            : 0;

        return res.json({
            success: true,
            symbol,
            range,
            from: period1,
            to: period2,
            totalArticlesAnalyzed: analyzedArticles.length,
            overallSentimentScore,
            articles: analyzedArticles
        });

    } catch (error) {
        console.error("RSS Sentiment Error:", error);
        return res.status(500).json({ error: "Failed to fetch sentiment from RSS." });
    }
};








import { Request, Response } from "express";
import yahooFinance from "yahoo-finance2";

export const getCompanyOverview = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    if (!symbol) return res.status(400).json({ error: "Symbol is required" });

    // Fetch company profile
    const summary: any = await yahooFinance.quoteSummary(symbol, {
      modules: ["assetProfile"],
    });

    const assetProfile = summary?.assetProfile || {};

    // Fetch peer recommendations
    const recData: any = await yahooFinance.recommendationsBySymbol(symbol);
    const peers = recData?.[0]?.recommendedSymbols || [];
    console.log(peers)
    // Format and return response
    return res.json({
      symbol,
      profile: {
        sector: assetProfile.sector || "N/A",
        industry: assetProfile.industry || "N/A",
        description: assetProfile.longBusinessSummary || "N/A",
        country: assetProfile.country || "N/A",
        city: assetProfile.city || "N/A",
        website: assetProfile.website || "N/A",
        employees: assetProfile.fullTimeEmployees || "N/A",
      },
      peers: peers.map((peer: any) => ({
        symbol: peer.symbol,
        name: peer.shortName || "",
        score: peer.score || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching company overview:", error);
    return res.status(500).json({ error: "Failed to fetch data" });
  }
};

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { maxTokens } from "../config/config.js";
import { logStep, logSuccess, logError } from "../utils/logger.js";

puppeteer.use(StealthPlugin());

class Gmgn {
  async getTokens(limit) {
    if (limit > maxTokens) {
      throw new Error(`Maximum token limit exceeded. Limit is ${maxTokens}.`);
    }

    logStep(`Launching browser to fetch top ${limit} tokens...`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.goto(
        "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?orderby=swaps&direction=desc&filters[]=renounced&filters[]=frozen",
        { waitUntil: "domcontentloaded", timeout: 60000 }
      );

      const tokens = await page.evaluate(async () => {
        const res = await fetch("https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?orderby=swaps&direction=desc&filters[]=renounced&filters[]=frozen");
        const json = await res.json();
        return json.data.rank.map((item) => item.address);
      });

      logSuccess(`Fetched ${tokens.length} tokens.`);
      return tokens.slice(0, limit);
    } catch (err) {
      logError(err.message);
      return [];
    } finally {
      await browser.close();
    }
  }

  async getTrades(tokenAddress) {
    logStep(`Fetching trades for ${tokenAddress}...`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.goto(
        `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${tokenAddress}?orderby=profit&direction=desc`,
        { waitUntil: "domcontentloaded", timeout: 60000 }
      );

      const trades = await page.evaluate(async () => {
        const res = await fetch(window.location.href);
        const json = await res.json();
        return json.data.map((item) => ({
          address: item.address,
          solAddress: item.native_transfer.from_address,
          profit: item.realized_profit,
          timestamp: item.created_at,
        }));
      });

      logSuccess(`Found ${trades.length} trades for token.`);
      return trades;
    } catch (err) {
      logError(err.message);
      return [];
    } finally {
      await browser.close();
    }
  }
}

export default Gmgn;

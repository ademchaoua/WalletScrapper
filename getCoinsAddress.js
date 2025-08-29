import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

(async () => {
  let browser;
  try {
    
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    console.log("Fetching Dexscreener...");
    await page.goto("https://dexscreener.com/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const serverData = await page.evaluate(() => {
      return window.__SERVER_DATA || null;
    });

    const data = serverData.route.data.dexScreenerData.pairs.map(coin => {
        return {
            address: coin.pairAddress,
            chainId: coin.chainId
        };
    });

    if (serverData) {
      console.log("Data extracted successfully:", data);
    } else {
      console.log("window.__SERVER_DATA not found in the page.");
    }

  } catch (error) {
    console.error("Error occurred:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser closed.");
    }
  }
})();


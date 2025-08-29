import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { setTimeout } from "timers/promises";
import fs from "fs/promises";
import readline from "readline";
import chalk from "chalk";

puppeteer.use(StealthPlugin());

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(chalk.cyan(question), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function logStep(message) {
  console.log(chalk.yellow("🔄 " + message));
}

async function logSuccess(message) {
  console.log(chalk.green("✅ " + message));
}

async function logError(message) {
  console.error(chalk.red("❌ " + message));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    const projectUrl = await prompt("📎 Enter project URL: ");
    const jsonFileName = await prompt("💾 Enter output file name: ");

    if (!jsonFileName || /[^a-zA-Z0-9_-]/.test(jsonFileName)) {
      throw new Error("Invalid file name.");
    }

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");

    logStep("Opening project page...");
    await page.goto(projectUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await setTimeout(2000 + Math.random() * 1000);

    logStep("Clicking 'Top Traders' button...");
    const buttons = await page.$$("button");
    let clicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes("Top Traders")) {
        await btn.click();
        clicked = true;
        await setTimeout(1500);
        break;
      }
    }

    if (!clicked) throw new Error("'Top Traders' button not found.");

    const projectName = await page.evaluate(() => {
      return document.querySelector("h2.chakra-heading")?.textContent?.trim() || "Unknown Project";
    });

    const extraData = await page.evaluate(() => {
      const getValueAfterLabel = (label) => {
        const allSpans = Array.from(document.querySelectorAll("span"));
        const labelIndex = allSpans.findIndex(span => span.textContent.trim() === label);
        if (labelIndex !== -1) {
          return allSpans[labelIndex + 1]?.textContent?.trim() || "N/A";
        }
        return "N/A";
      };

      return {
        priceUSD: getValueAfterLabel("Price USD"),
        priceWBNB: getValueAfterLabel("Price"),
        liquidity: getValueAfterLabel("Liquidity"),
        fdv: getValueAfterLabel("FDV"),
        marketCap: getValueAfterLabel("Mkt Cap")
      };
    });

    logStep("Waiting for top traders table...");
    await page.waitForSelector("div.custom-1kikirr", { timeout: 10000 });

    const topTraders = await page.evaluate(() => {
      const rows = document.querySelectorAll("div.custom-1nvxwu0");
      const traders = [];
      const seen = new Set();

      rows.forEach((row, index) => {
        const link = row.querySelector("a[href*='solscan.io/account']") || row.querySelector("a[href*='bscscan.com/address']");
        if (!link) return;

        const addressUrl = link.href;
        const address = addressUrl.split("/").pop();

        if (seen.has(address)) return;
        seen.add(address);

        const cells = row.querySelectorAll("div[class^='custom-']");

        if (cells[7]?.textContent?.trim() === "Unknown") return;

        const getValues = (cell) => {
          return {
            usd: cell?.querySelector("span.custom-dv3t8y")?.textContent?.trim() || cell?.querySelector("span.custom-rcecxm")?.textContent?.trim() || "",
            tokens: cell?.querySelectorAll("span.custom-2ygcmq")[0]?.textContent?.trim() || "",
            txns: cell?.querySelectorAll("span.custom-2ygcmq")[1]?.textContent?.trim() || "",
          };
        };

        traders.push({
          rank: index + 1,
          address,
          addressUrl,
          bought: getValues(cells[3]),
          sold: getValues(cells[4]),
          pnl: cells[5]?.textContent?.trim() || "",
          unrealized: cells[6]?.textContent?.trim() || "",
          balance: cells[7]?.textContent?.trim() || ""
        });
      });

      return traders;
    });

    if (topTraders.length === 0) {
      logError("No top traders found.");
    } else {
      console.log(chalk.magenta("\n📊 Top 5 Traders Preview:"));
      console.table(topTraders.slice(0, 5).map(t => ({
        Rank: t.rank,
        Address: t.address,
        Bought: t.bought.usd,
        Sold: t.sold.usd,
        PnL: t.pnl
      })));
    }

    const now = new Date().toISOString();
    const output = { projectName, date: now, ...extraData, topTraders };

    await fs.writeFile(`${jsonFileName}.json`, JSON.stringify(output, null, 2));
    logSuccess(`Saved to ${jsonFileName}.json`);

  } catch (error) {
    logError(error.message);
  } finally {
    await browser.close();
  }
}

main();

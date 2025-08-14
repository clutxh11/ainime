import { NextRequest } from "next/server";
import puppeteer from "puppeteer";

// POST /api/puppeteer/html
// Body: { html: string, selector?: string }
export async function POST(req: NextRequest) {
  let browser: puppeteer.Browser | null = null;
  try {
    const { html, selector } = await req.json();
    if (!html) {
      return new Response(JSON.stringify({ error: "Missing html" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    if (selector) {
      await page.waitForSelector(selector, { timeout: 15000 }).catch(() => {});
    }
    const png = await page.screenshot({ type: "png" });
    return new Response(png, {
      status: 200,
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  } finally {
    try {
      await browser?.close();
    } catch {}
  }
}

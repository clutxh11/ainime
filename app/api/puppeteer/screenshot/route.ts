import { NextRequest } from "next/server";
import puppeteer from "puppeteer";

// POST /api/puppeteer/screenshot
// Body: { url?: string, html?: string, type?: 'png'|'jpeg'|'pdf', width?: number, height?: number, fullPage?: boolean }
export async function POST(req: NextRequest) {
  let browser: puppeteer.Browser | null = null;
  try {
    const body = await req.json().catch(() => ({} as any));
    const {
      url,
      html,
      type = "png",
      width = 1280,
      height = 720,
      fullPage = false,
    } = body || {};

    if (!url && !html) {
      return new Response(JSON.stringify({ error: "Provide url or html" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--no-zygote",
        "--disable-dev-shm-usage",
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: Number(width), height: Number(height) });

    if (url) {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    } else if (html) {
      await page.setContent(String(html), { waitUntil: "networkidle0" });
    }

    if (type === "pdf") {
      const pdf = await page.pdf({
        width: `${width}px`,
        height: `${height}px`,
        printBackground: true,
      });
      return new Response(pdf, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "cache-control": "no-store",
        },
      });
    }

    const buffer = await page.screenshot({
      type: type === "jpeg" ? "jpeg" : "png",
      fullPage: Boolean(fullPage),
    });
    return new Response(buffer, {
      status: 200,
      headers: {
        "content-type": type === "jpeg" ? "image/jpeg" : "image/png",
        "cache-control": "no-store",
      },
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

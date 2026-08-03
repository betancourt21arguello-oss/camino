import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;

const MONTH_MAP = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
};

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
  }
  return browser;
}

async function extractTranscript(videoUrl) {
  const browserInstance = await getBrowser();
  const context = await browserInstance.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "es-419",
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  let timedtextUrl = null;

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/timedtext") || url.includes("timedtext")) {
      try {
        const text = await response.text();
        if (text && text.includes("<text")) {
          timedtextUrl = url;
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  });

  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "stylesheet", "font", "media"].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  try {
    await page.goto(videoUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(4000);

    const ytData = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("script"));
      for (const s of all) {
        const t = s.textContent || "";
        const m = t.match(
          /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script>)/s
        );
        if (m) {
          try {
            return JSON.parse(m[1]);
          } catch {
            return null;
          }
        }
      }
      return null;
    });

    const tracks =
      ytData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log("[Transcript Service] HTML captionTracks:", tracks?.length ?? 0);

    let xml = null;

    if (Array.isArray(tracks) && tracks.length > 0) {
      const esTrack =
        tracks.find((t) => (t.languageCode || "").startsWith("es")) ||
        tracks[0];
      const trackUrl = esTrack.baseUrl;
      console.log(
        "[Transcript Service] Fetching timedtext from track:",
        trackUrl?.slice(0, 80)
      );

      try {
        xml = await page.evaluate(async (url) => {
          const res = await fetch(url);
          return await res.text();
        }, trackUrl);
        console.log(
          "[Transcript Service] Timedtext response length:",
          xml?.length ?? 0
        );
      } catch (e) {
        console.log("[Transcript Service] Track fetch failed:", e.message);
      }
    }

    if (!xml && timedtextUrl) {
      console.log(
        "[Transcript Service] Fetching intercepted timedtext:",
        timedtextUrl?.slice(0, 80)
      );
      try {
        xml = await page.evaluate(async (url) => {
          const res = await fetch(url);
          return await res.text();
        }, timedtextUrl);
      } catch (e) {
        console.log("[Transcript Service] Intercepted fetch failed:", e.message);
      }
    }

    if (!xml || !xml.includes("<text")) {
      console.log("[Transcript Service] No timedtext XML found");
      return null;
    }

    const lines = [];
    const regex = /<text[^>]+start="([^"]+)"[^>]+dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      lines.push({
        text: m[3],
        offset: parseFloat(m[1]),
        duration: parseFloat(m[2]),
      });
    }

    console.log("[Transcript Service] Parsed lines:", lines.length);
    return lines.length > 0 ? lines : null;
  } catch (error) {
    console.error("[Transcript Service] Error:", error);
    return null;
  } finally {
    await context.close();
  }
}

app.post("/api/transcript", async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl || typeof videoUrl !== "string") {
      return res.status(400).json({ error: "Missing videoUrl" });
    }

    console.log("[Transcript Service] Request for:", videoUrl);
    const start = Date.now();
    const transcript = await extractTranscript(videoUrl);
    const ms = Date.now() - start;

    console.log("[Transcript Service] Done in", ms, "ms, lines:", transcript?.length ?? 0);

    if (!transcript) {
      return res.status(200).json({ transcript: null });
    }

    return res.status(200).json({ transcript });
  } catch (error) {
    console.error("[Transcript Service] Handler error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

app.get("/api/liturgy", async (req, res) => {
  try {
    const date = String(req.query.date || "");
    const part = String(req.query.part || "").toLowerCase();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Missing or invalid date (YYYY-MM-DD)" });
    }

    const allowedParts = new Set(["laudes", "visperas", "completas"]);
    if (!allowedParts.has(part)) {
      return res.status(400).json({ error: "Missing or invalid part (laudes|visperas|completas)" });
    }

    const [year, month, day] = date.split("-");
    const monthKey = Object.keys(MONTH_MAP).find(
      (key) => MONTH_MAP[key] === String(month).padStart(2, "0")
    );

    if (!monthKey) {
      return res.status(400).json({ error: "Unsupported month for liturgy source" });
    }

    const url = `https://liturgiadelashoras.github.io/sync/${year}/${monthKey}/${String(day).padStart(2, "0")}/${part}.htm`;

    console.log("[Liturgy Scraper] Fetching", url);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return res.status(200).json({ text: null, source: url });
    }

    const html = await response.text();
    const lines = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const text = lines.join("\n");
    const decoded = text
      .replace(/&ntilde;/g, "ñ")
      .replace(/&Ntilde;/g, "Ñ")
      .replace(/&aacute;/g, "á")
      .replace(/&eacute;/g, "é")
      .replace(/&iacute;/g, "í")
      .replace(/&oacute;/g, "ó")
      .replace(/&uacute;/g, "ú")
      .replace(/&Aacute;/g, "Á")
      .replace(/&Eacute;/g, "É")
      .replace(/&Iacute;/g, "Í")
      .replace(/&Oacute;/g, "Ó")
      .replace(/&Uacute;/g, "Ú")
      .replace(/&uuml;/g, "ü")
      .replace(/&Uuml;/g, "Ü")
      .replace(/&nbsp;/g, " ");

    return res.status(200).json({ text: decoded, source: url });
  } catch (error) {
    console.error("[Liturgy Scraper] Error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log("[Transcript Service] Listening on", PORT);
});

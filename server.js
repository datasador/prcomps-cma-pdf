const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/render", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("Missing URL parameter");
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1400,
      height: 1800,
      deviceScaleFactor: 2
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.waitForSelector("#reportContent", {
      visible: true,
      timeout: 15000
    });

    await page.waitForSelector("#mapBox", {
      visible: true,
      timeout: 15000
    });

    await page.evaluate(() =>
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve()
    );

    await page.waitForFunction(() => {
      const el = document.querySelector("#mapBox");
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 300 && r.height > 300;
    }, { timeout: 15000 });

    await page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
    });

    await new Promise(resolve => setTimeout(resolve, 2200));

    const mapHandle = await page.$("#mapBox");
    if (!mapHandle) {
      throw new Error("mapBox not found");
    }

    const mapImageBase64 = await mapHandle.screenshot({
      type: "png",
      encoding: "base64"
    });

    await page.evaluate((base64) => {
      const mapBox = document.getElementById("mapBox");
      if (!mapBox) return;

      mapBox.innerHTML = "";

      const img = document.createElement("img");
      img.src = "data:image/png;base64," + base64;
      img.alt = "Comparable Sales Map";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.display = "block";
      img.style.objectFit = "cover";

      mapBox.appendChild(img);
    }, mapImageBase64);

    await page.emulateMediaType("print");
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,

      displayHeaderFooter: true,

      headerTemplate: `
        <div style="width:100%; font-size:10px;"></div>
      `,

      footerTemplate: `
        <div style="
          width:100%;
          font-size:10px;
          color:#0e4d9f;
          padding:0 10mm;
          display:flex;
          justify-content:space-between;
          align-items:center;
        ">
          <span>PRComps – Comparative Market Analysis</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,

      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "18mm",
        left: "10mm"
      }
    });

    const d = new Date();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;

    const ts =
      d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0") + "-" +
      hours + "-" + minutes + ampm;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=PRComps-CMA-${ts}.pdf`
    });

    res.send(pdf);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).send("PDF generation error: " + error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.get("/", (req, res) => {
  res.send("PRComps CMA PDF server is running.");
});

app.listen(PORT, () => {
  console.log("PDF server running on port", PORT);
});

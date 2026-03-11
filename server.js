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

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.waitForSelector("#reportContent", { timeout: 15000 });

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

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=PRComps_CMA.pdf"
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

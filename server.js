const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/render", async (req, res) => {

  const url = req.query.url;

  if (!url) {
    return res.status(400).send("Missing URL parameter");
  }

  try {

    const browser = await puppeteer.launch({
      args: ["--no-sandbox","--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.waitForTimeout(4000);

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=PRComps_CMA.pdf"
    });

    res.send(pdf);

  } catch (error) {

    console.error(error);
    res.status(500).send("PDF generation error");

  }

});

app.listen(PORT, () => {
  console.log("PDF server running on port", PORT);
});

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Tell Express to serve files from the "public" folder
app.use(express.static('public'));

app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    console.log(`\n📥 Scrape Request: ${url}`);

    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage' // Add this line
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Go to URL and wait for basic HTML to load
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Scrape Text, Author, and the hidden Thumbnail Image
        const scrapedData = await page.evaluate(() => {
            // 1. Get Author
            let author = document.querySelector('h1')?.innerText
                || document.querySelector('.top-card-layout__title')?.innerText
                || "LinkedIn User";
            author = author.replace("'s Post", "").trim();

            // 2. Get Text
            let text = "";
            const textContainer = document.querySelector('[data-test-id="main-feed-activity-card__commentary"]')
                || document.querySelector('.core-section-container__content');

            if (textContainer) {
                text = textContainer.innerText;
            } else {
                const paragraphs = Array.from(document.querySelectorAll('p, div[dir="ltr"]'));
                text = paragraphs.map(p => p.innerText).join('\n\n');
            }

            // 3. Get the Official Post Thumbnail (Open Graph Image)
            let attachedImageUrl = document.querySelector('meta[property="og:image"]')?.content || "";

            // If the thumbnail is just the author's profile picture, it means there is no attached document.
            // We ignore it so text-only posts stay text-only.
            if (attachedImageUrl.includes('profile-displayphoto')) {
                attachedImageUrl = "";
            }

            return {
                author,
                text: text.trim().substring(0, 2500),
                mediaUrl: attachedImageUrl
            };
        });

        await browser.close();
        console.log(`✅ Successfully scraped! Attached Image Found: ${scrapedData.mediaUrl ? 'Yes' : 'No'}`);

        // Send data to frontend
        res.json({
            author: scrapedData.author,
            text: scrapedData.text,
            mediaUrl: scrapedData.mediaUrl, // Sending the thumbnail URL
            originalUrl: url
        });

    } catch (error) {
        if (browser) await browser.close();
        console.error("❌ Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Backend API running on http://localhost:3000'));
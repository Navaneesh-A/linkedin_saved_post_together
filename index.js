const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs'); // Built-in Node file system
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- NEW: Database Setup ---
const dbPath = path.join(__dirname, 'posts.json');

// Helper function to read the database
function getSavedPosts() {
    if (!fs.existsSync(dbPath)) return [];
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
}

// Helper function to write to the database
function savePostToDB(newPost) {
    const posts = getSavedPosts();
    posts.unshift(newPost); // Add to the top of the list
    fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2));

}
app.delete('/posts/:id', (req, res) => {
    let posts = getSavedPosts();
    posts = posts.filter(p => p.id !== req.params.id);
    fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2));
    res.json({ success: true });
});

// --- NEW: Route to fetch history on page load ---
app.get('/posts', (req, res) => {
    res.json(getSavedPosts());
});
// ---------------------------

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
                '--disable-dev-shm-usage',
                '--disable-gpu', // Disables graphics hardware acceleration
                '--disable-software-rasterizer', // Disables 3D rendering
                '--no-zygote',
                '--disable-extensions'
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

        // --- FIX 1: Ignore non-critical aborted requests ---
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (navError) {
            console.log("⚠️ Minor navigation drop (ignored):", navError.message);
            // We proceed anyway because the HTML we need usually loads before the error happens!
        }

        const scrapedData = await page.evaluate(() => {
            let author = document.querySelector('h1')?.innerText
                || document.querySelector('.top-card-layout__title')?.innerText
                || document.querySelector('meta[property="og:title"]')?.content?.split(' on LinkedIn')[0]
                || "LinkedIn User";
            author = author.replace(/['’]s Post/g, "").trim();

            let text = "";
            const textContainer = document.querySelector('[data-test-id="main-feed-activity-card__commentary"]')
                || document.querySelector('.core-section-container__content');
            if (textContainer) {
                text = textContainer.innerText;
            } else {
                text = document.querySelector('meta[property="og:description"]')?.content || "Text extraction failed.";
            }

            let mediaUrl = document.querySelector('meta[property="og:image"]')?.content
                || document.querySelector('img[src*="media.licdn.com/dms/image"]')?.src
                || "";

            if (mediaUrl.includes('profile-displayphoto') || mediaUrl.includes('ghost-person')) {
                mediaUrl = "";
            }

            return { author, text: text.trim().substring(0, 2500), mediaUrl };
        });

        console.log(`✅ Scraped! Image Found: ${scrapedData.mediaUrl ? 'Yes' : 'No'}`);

        const finalPostData = {
            id: Date.now().toString(),
            author: scrapedData.author,
            text: scrapedData.text,
            mediaUrl: scrapedData.mediaUrl,
            originalUrl: url
        };

        savePostToDB(finalPostData);
        res.json(finalPostData);

    } catch (error) {
        console.error("❌ Critical Error:", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        // --- FIX 2: The Ultimate Cleanup Guarantee ---
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.log("⚠️ Could not close browser properly.");
            }
        }
    }
});

app.listen(3000, () => console.log('Backend API running on http://localhost:3000'));
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
    let posts = getSavedPosts();
    // Check if the post already exists by URL
    const exists = posts.find(p => p.originalUrl === newPost.originalUrl);
    if (!exists) {
        posts.unshift(newPost);
        fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2));
    }
    if (!newPost.group) {
        newPost.group = "General";
    }


}

// --- NEW: Route to fetch history on page load ---
app.get('/posts', (req, res) => {
    res.json(getSavedPosts());
});
// ---------------------------

app.post('/scrape', async (req, res) => {
    const { url, group } = req.body;
    console.log(`\n📥 Scrape Request: ${url}`);
    //console.log(req.body);
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const scrapedData = await page.evaluate(() => {
            let author = document.querySelector('h1')?.innerText
                || document.querySelector('.top-card-layout__title')?.innerText
                || "LinkedIn User";
            author = author.replace("'s Post", "").trim();

            let text = "";
            const textContainer = document.querySelector('[data-test-id="main-feed-activity-card__commentary"]')
                || document.querySelector('.core-section-container__content');

            if (textContainer) {
                text = textContainer.innerText;
            } else {
                const paragraphs = Array.from(document.querySelectorAll('p, div[dir="ltr"]'));
                text = paragraphs.map(p => p.innerText).join('\n\n');
            }

            let attachedImageUrl = document.querySelector('meta[property="og:image"]')?.content || "";
            if (attachedImageUrl.includes('profile-displayphoto')) attachedImageUrl = "";

            return {
                author,
                text: text.trim().substring(0, 2500),
                mediaUrl: attachedImageUrl
            };
        });

        await browser.close();

        const finalPostData = {
            author: scrapedData.author,
            text: scrapedData.text,
            mediaUrl: scrapedData.mediaUrl,
            originalUrl: url,
            group: group || "General",
            date: new Date().toISOString().split('T')[0]
        };

        // --- NEW: Save the scraped data to our JSON file ---
        savePostToDB(finalPostData);
        // ---------------------------------------------------

        res.json(finalPostData);

    } catch (error) {
        if (browser) await browser.close();
        console.error("❌ Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});
// Add these routes below your /scrape route // NEW FRICK
app.delete('/posts/:id', (req, res) => {
    let posts = getSavedPosts();
    posts = posts.filter(p => p.originalUrl !== req.params.id);
    fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2));
    res.json({ success: true });
});

app.put('/posts/:id/remind', (req, res) => {
    let posts = getSavedPosts();
    const post = posts.find(p => p.originalUrl === req.params.id);
    if (post) {
        post.remind = !post.remind;
        fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2));
        res.json({ remind: post.remind });
    } else {
        res.status(404).json({ error: "Post not found" });
    }
});

app.listen(3000, () => console.log('Backend API running on http://localhost:3000'));



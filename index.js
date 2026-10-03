const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs'); // Built-in Node file system
const path = require('path');
const admin = require('firebase-admin');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
// Ensure this is at the very top, before any routes
app.use(cors({
    origin: '*', // Allows requests from any device/IP
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
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
    const exists = posts.find(p => p.originalUrl === newPost.originalUrl);
    if (!exists) {
        posts.unshift(newPost);
        fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2));
    } else {
        exists.savedBy = [...new Set([...(exists.savedBy || []), exists.userId, ...newPost.savedBy].filter(Boolean))];
        exists.isPublic = exists.isPublic !== false || newPost.isPublic;
        delete exists.userId;
        fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2));
    }
}

function getFirebaseAdminAuth() {
    if (!process.env.FIREBASE_PROJECT_ID) {
        const error = new Error('FIREBASE_PROJECT_ID is required to verify Firebase sign-in.');
        error.status = 503;
        throw error;
    }
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    }
    return admin.auth();
}

async function verifyFirebaseUser(req) {
    const authorization = req.get('Authorization') || '';
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
        const error = new Error('Sign-in is required to save or view user posts.');
        error.status = 401;
        throw error;
    }
    try {
        return await getFirebaseAdminAuth().verifyIdToken(tokenMatch[1]);
    } catch (error) {
        if (!error.status && String(error.code || '').startsWith('auth/')) {
            error.status = 401;
        }
        throw error;
    }
}

app.get('/posts', (req, res) => {
    try {
        const posts = getSavedPosts();
        res.json(posts.filter(post => post.isPublic !== false));
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ error: "Failed to fetch posts" });
    }
});

app.get('/my-posts', async (req, res) => {
    try {
        const user = await verifyFirebaseUser(req);
        const posts = getSavedPosts().filter(post =>
            post.userId === user.uid || (post.savedBy || []).includes(user.uid)
        );
        res.json(posts);
    } catch (error) {
        console.error("Error fetching user posts:", error);
        res.status(error.status || 500).json({
            error: error.status === 401
                ? error.message
                : error.status === 503
                    ? error.message
                    : 'Could not verify sign-in.'
        });
    }
});

app.post('/my-posts', async (req, res) => {
    try {
        const user = await verifyFirebaseUser(req);
        const { author, text, mediaUrl, originalUrl, group, date, remind } = req.body;
        if (
            typeof author !== 'string' ||
            typeof text !== 'string' ||
            typeof originalUrl !== 'string' ||
            !author.trim() ||
            !originalUrl.trim() ||
            author.length > 300 ||
            text.length > 10000
        ) {
            return res.status(400).json({ error: 'Guest scrape data is invalid.' });
        }

        let postUrl;
        try {
            postUrl = new URL(originalUrl);
        } catch {
            return res.status(400).json({ error: 'Guest scrape URL is invalid.' });
        }
        if (!['http:', 'https:'].includes(postUrl.protocol)) {
            return res.status(400).json({ error: 'Guest scrape URL must use HTTP or HTTPS.' });
        }

        const savedPost = {
            author: author.trim(),
            text,
            mediaUrl: typeof mediaUrl === 'string' ? mediaUrl : '',
            originalUrl: postUrl.href,
            group: typeof group === 'string' && group.trim() ? group.trim() : 'General',
            date: typeof date === 'string' ? date : new Date().toISOString().split('T')[0],
            remind: Boolean(remind),
            savedBy: [user.uid],
            isPublic: false
        };
        savePostToDB(savedPost);
        res.status(201).json(savedPost);
    } catch (error) {
        console.error("Error saving guest scrape:", error);
        res.status(error.status || 500).json({
            error: error.status === 401 || error.status === 503
                ? error.message
                : 'Could not save guest scrape.'
        });
    }
});

app.get('/firebase-config', (req, res) => {
    const config = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };

    if (Object.values(config).some(value => !value)) {
        return res.status(500).json({ error: 'Firebase configuration is missing on the server.' });
    }

    res.json(config);
});
// ---------------------------

// adding thes functions below so that no navigation error due to click

// This targets the button inside the container with the input field
app.post('/scrape', async (req, res) => {
    const { url, group, save } = req.body;
    console.log(`\n📥 Scrape Request: ${url}`);
    //console.log(req.body);
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        const user = save === true ? await verifyFirebaseUser(req) : null;
        const adminEmail = (process.env.PUBLIC_GALLERY_ADMIN_EMAIL || '').trim().toLowerCase();
        const isPublic = Boolean(
            user &&
            adminEmail &&
            user.email_verified &&
            user.email?.toLowerCase() === adminEmail
        );

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage']
        });

        // 3. NOW you can safely read/scrape data

        const page = await browser.newPage();
        // await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        // 1. Navigate to the page and let it follow short link redirects
        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Capture the final expanded URL after redirection (e.g., lnkd.in -> linkedin.com/posts/...)
        const resolvedurl = page.url();
        console.log(resolvedurl);
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
            originalUrl: resolvedurl,
            group: group || "General",
            date: new Date().toISOString().split('T')[0],
            remind: false
        };

        if (user) {
            savePostToDB({
                ...finalPostData,
                savedBy: [user.uid],
                isPublic
            });
        }

        res.json({ ...finalPostData, isPublic });

    } catch (error) {
        if (browser) await browser.close();
        console.error("❌ Error:", error.message);
        res.status(error.status || 500).json({ error: error.message });
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

app.listen(5700, '0.0.0.0', () => console.log('Backend API running on http://0.0.0.0:3000'));

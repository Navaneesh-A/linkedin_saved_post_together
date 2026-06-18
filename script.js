// ==========================================
// 1. INITIALIZATION & DATABASE FETCH
// ==========================================
let savedPosts = [];
// Add this line at the top of script.js
let showOnlyReminders = false;
// When the page loads, ask the backend for the saved posts
window.onload = async () => {
    try {
        const response = await fetch('http://localhost:3000/posts');
        savedPosts = await response.json();

        // Render them on the screen
        // We reverse it so the newest stays at the top of the feed
        savedPosts.slice().reverse().forEach(post => renderPost(post));
        updateHistory();
    } catch (error) {
        console.error("Could not load history from backend:", error);
    }
};
// ==========================================
// 2. VALIDATION LOGIC
// ==========================================
function isValidLinkedInUrl(url) {
    const regex = /^(https?:\/\/)?(www\.)?linkedin\.com\/(posts|feed\/update|pulse|video)\/.+$/i;
    return regex.test(url);
}

function showError(message) {
    let errorDiv = document.getElementById('errorMsg');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorMsg';
        errorDiv.className = 'text-red-500 text-sm font-bold mb-6 -mt-4 ml-2';

        const postsContainer = document.getElementById('postsContainer');
        postsContainer.parentNode.insertBefore(errorDiv, postsContainer);
    }
    errorDiv.innerText = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    const errorDiv = document.getElementById('errorMsg');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// ==========================================
// 3. MAIN SCRAPE & SAVE FUNCTION
// ==========================================
async function savePost() {
    const input = document.getElementById('linkInput');
    const url = input.value.trim();

    if (!url) { showError("Please enter a URL."); return; }
    if (!isValidLinkedInUrl(url)) { showError("Invalid link. Please paste a valid LinkedIn post URL."); return; }

    hideError();

    try {
        const response = await fetch('http://localhost:3000/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        // --- NEW: Update UI only (Backend already saved it to file) ---
        savedPosts.unshift(data);
        updateHistory();
        // --------------------------------------------------------------

        confetti({
            particleCount: 150, spread: 80, origin: { y: 0.6 },
            colors: ['#0A66C2', '#FFFFFF', '#F8C77E']
        });

        renderPost(data);
        input.value = '';
    } catch (error) {
        console.error("Failed to fetch:", error);
        showError("Cannot connect to backend. Is your Node server running?");
    }
}

// ==========================================
// ==========================================
// 4. RENDERING UI
// ==========================================

function renderPost(data) {
    const container = document.getElementById('postsContainer');
    const uniqueId = 'post-' + Date.now() + Math.floor(Math.random() * 1000);

    // 1. Normalize the text: 
    // Convert all types of line breaks to a standard format, then replace with <br>
    // This removes the "messy" excess spaces.
    let cleanText = (data.text || "")
        .replace(/\r\n/g, '\n') // Standardize Windows breaks
        .replace(/\n\n+/g, '\n\n'); // Collapse 3+ breaks into 2

    let isLong = cleanText.length > 250;
    let shortText = isLong ? cleanText.substring(0, 250) + '...' : cleanText;

    // 2. Convert to HTML for display
    const shortHTML = shortText.replace(/\n/g, '<br>');
    const longHTML = cleanText.replace(/\n/g, '<br>');

    const postHTML = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="font-bold text-lg mb-4 text-gray-900">${data.author}</h3>
<button onclick="toggleRemind('${data.originalUrl}')" 
    class="text-xl ${data.remind ? 'text-yellow-500' : 'text-gray-300'}">
    🔔
</button>
            ${renderMedia(data)}
            <div class="mt-4 text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
                <span id="${uniqueId}-short">${shortHTML}</span>
                <span id="${uniqueId}-long" class="hidden">${longHTML}</span>
            </div>
            ${isLong ? `<button onclick="toggleText('${uniqueId}')" id="${uniqueId}-btn" class="text-blue-600 font-bold mt-2 text-sm hover:underline">Read More</button>` : ''}
            <a href="${data.originalUrl}" target="_blank" class="text-xs text-gray-400 hover:underline mt-6 block">View Original</a>
        </div>
       
    `;
    container.insertAdjacentHTML('afterbegin', postHTML);
}
// FRICK REMINDER SEE BOTTOM UPDATED SO NO RELOAD NO RENDERALL
// async function toggleRemind(id) {
//     const res = await fetch(`http://localhost:3000/posts/${encodeURIComponent(id)}/remind`, { method: 'PUT' });
//     const data = await res.json();
//     const post = savedPosts.find(p => p.originalUrl === id);
//     if (post) post.remind = data.remind;
//     renderAll();
// }


function toggleText(id) {
    const shortNode = document.getElementById(`${id}-short`);
    const longNode = document.getElementById(`${id}-long`);
    const btn = document.getElementById(`${id}-btn`);

    if (longNode.classList.contains('hidden')) {
        longNode.classList.remove('hidden');
        shortNode.classList.add('hidden');
        btn.innerText = 'Read Less';
    } else {
        longNode.classList.add('hidden');
        shortNode.classList.remove('hidden');
        btn.innerText = 'Read More';
    }
}

function renderMedia(data) {
    // Filter out LinkedIn's generic placeholder images
    const isGenericFallback = data.mediaUrl && data.mediaUrl.includes('aero-v1/sc/h');

    if (data.mediaUrl && !isGenericFallback) {
        return `<img src="${data.mediaUrl}" class="w-full max-h-[400px] object-contain bg-gray-50 rounded border border-gray-200 mb-4">`;
    }
    return '';
}

// --- NEW: History & Reminder Logic --- FRICK NEW

function updateHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    container.innerHTML = savedPosts.map(post => `
        <li class="p-3 bg-gray-50 rounded flex justify-between items-center mb-2">
            <span class="truncate text-sm w-3/4">${post.author}</span>
            <button onclick="deletePost('${post.originalUrl}')" class="text-red-600">🗑️</button>
        </li>
    `).join('');
}

async function deletePost(id) {
    if (!confirm("Delete post?")) return;
    await fetch(`http://localhost:3000/posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    savedPosts = savedPosts.filter(p => p.originalUrl !== id);
    renderAll(); // Assuming you have a renderAll function to refresh the UI
}



// Add this to script.js to complete the lifecycle


// --- ACTIVATED: Core Refresh Logic ---
function renderAll() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    // This is the logic that respects your FAV filter
    let displayPosts = showOnlyReminders ? savedPosts.filter(p => p.remind) : savedPosts;

    displayPosts.slice().reverse().forEach(post => renderPost(post));
    updateHistory();
}

// --- ACTIVATED: Filter Toggle ---
function toggleReminderFilter() {
    showOnlyReminders = !showOnlyReminders;
    renderAll();
}

// --- ACTIVATED: Single source of truth for Remind ---
async function toggleRemind(url) {
    const encodedUrl = encodeURIComponent(url);
    try {
        const res = await fetch(`http://localhost:3000/posts/${encodedUrl}/remind`, { method: 'PUT' });
        const data = await res.json();

        const post = savedPosts.find(p => p.originalUrl === url);
        if (post) {
            post.remind = data.remind;

            // Visual update without reload
            const bellBtn = document.querySelector(`button[onclick="toggleRemind('${url}')"]`);
            if (bellBtn) {
                bellBtn.classList.toggle('text-yellow-500', data.remind);
                bellBtn.classList.toggle('text-gray-300', !data.remind);
            }
        }
    } catch (err) {
        console.error("Failed to toggle:", err);
    }
}
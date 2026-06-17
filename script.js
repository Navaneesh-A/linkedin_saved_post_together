let savedPosts = [];

// ==========================================
// 1. INITIALIZATION (Fetching from Node.js)
// ==========================================
window.onload = async () => {
    try {
        const response = await fetch('http://localhost:3000/posts');
        savedPosts = await response.json();

        // Render main feed (newest at the top)
        savedPosts.slice().reverse().forEach(post => renderPost(post));

        // Render the right-side history bar
        updateHistory();
    } catch (error) {
        console.error("Could not load history from backend:", error);
    }
};

// ==========================================
// 2. VALIDATION
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
    if (errorDiv) errorDiv.style.display = 'none';
}

// ==========================================
// 3. SCRAPE & SAVE
// ==========================================
async function savePost() {
    const input = document.getElementById('linkInput');
    const saveBtn = document.getElementById('saveBtn'); // Grab the button
    const url = input.value.trim();

    if (!url) { showError("Please enter a URL."); return; }
    if (!isValidLinkedInUrl(url)) { showError("Invalid link. Please paste a valid LinkedIn post URL."); return; }

    hideError();

    // --- NEW: Loading UI ---
    saveBtn.innerText = "Scraping...";
    saveBtn.disabled = true;
    saveBtn.classList.add("opacity-50", "cursor-not-allowed");

    try {
        const response = await fetch('http://localhost:3000/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        // --- NEW: Bulletproof Error Catching ---
        // If the backend sent a 500 error, stop right here and show it!
        if (!response.ok) {
            throw new Error(data.error || "LinkedIn blocked the scraper. Please try again.");
        }

        // Update local array & Sidebar History
        savedPosts.unshift(data);
        updateHistory();

        confetti({
            particleCount: 150, spread: 80, origin: { y: 0.6 },
            colors: ['#0A66C2', '#FFFFFF', '#F8C77E']
        });

        renderPost(data);
        input.value = '';

    } catch (error) {
        console.error("Failed to fetch:", error);
        // Show the actual error message on the screen instead of crashing
        showError(error.message || "Cannot connect to backend. Is your Node server running?");
    } finally {
        // --- NEW: Reset the button when done (whether it succeeded or failed) ---
        saveBtn.innerText = "Save";
        saveBtn.disabled = false;
        saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
}

// ==========================================
// 4. RENDERING MAIN POSTS
// ==========================================
function renderPost(data) {
    const container = document.getElementById('postsContainer');
    const uniqueId = 'post-' + Date.now() + Math.floor(Math.random() * 1000);

    let rawText = data.text || "";
    let isLong = rawText.length > 250;

    let shortText = rawText;
    if (isLong) shortText = rawText.substring(0, 250) + '...';

    const postHTML = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="font-bold text-lg mb-4 text-gray-900">${data.author}</h3>
            ${renderMedia(data)}
            
            <div class="mt-4 text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
                <span id="${uniqueId}-short">${shortText}</span>
                <span id="${uniqueId}-long" class="hidden">${rawText}</span>
            </div>
            
            ${isLong ? `<button onclick="toggleText('${uniqueId}')" id="${uniqueId}-btn" class="text-blue-600 font-bold mt-2 text-sm hover:underline">Read More</button>` : ''}
            <a href="${data.originalUrl}" target="_blank" class="text-xs text-gray-400 hover:underline mt-6 block">View Original</a>
        </div>
    `;
    container.insertAdjacentHTML('afterbegin', postHTML);
}
// ==========================================
// 🔴 DELETE POST FUNCTION
// ==========================================
async function deletePost(id) {
    if (!confirm("Delete this post permanently?")) return;

    try {
        // 1. Tell the backend to delete it from posts.json
        await fetch(`http://localhost:3000/posts/${id}`, { method: 'DELETE' });

        // 2. Remove it from your local memory
        savedPosts = savedPosts.filter(p => p.id !== id);

        // 3. Update the History Sidebar
        updateHistory();

        // 4. Update the Main Feed to remove the deleted post
        const container = document.getElementById('postsContainer');
        container.innerHTML = ''; // Clear the screen
        savedPosts.slice().reverse().forEach(post => renderPost(post)); // Redraw remaining posts

    } catch (err) {
        alert("Failed to delete post. Is your server running?");
        console.error(err);
    }
}
// ==========================================
// 5. RENDERING HISTORY SIDEBAR
// ==========================================
function updateHistory() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;
    historyContainer.innerHTML = '';

    savedPosts.forEach((post) => {
        let snippet = post.text ? post.text.substring(0, 45) + '...' : 'Media attachment';

        const historyItem = `
            <li class="p-3 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition flex justify-between items-center">
                <div class="cursor-pointer overflow-hidden flex-1" onclick="window.open('${post.originalUrl}', '_blank')">
                    <p class="font-bold text-sm text-gray-900 truncate">${post.author}</p>
                    <p class="text-xs text-gray-500 mt-1 truncate">${snippet}</p>
                </div>
                <button onclick="deletePost('${post.id}')" class="text-red-600 bg-red-100 hover:bg-red-200 transition ml-2 p-2 rounded text-lg" title="Delete Post">🗑️</button>
            </li>
        `;
        historyContainer.insertAdjacentHTML('beforeend', historyItem);
    });
}
// ==========================================
// 6. HELPER FUNCTIONS
// ==========================================
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
    const isGenericFallback = data.mediaUrl && data.mediaUrl.includes('aero-v1/sc/h');
    if (data.mediaUrl && !isGenericFallback) {
        return `<img src="${data.mediaUrl}" class="w-full max-h-[400px] object-contain bg-gray-50 rounded border border-gray-200 mb-4">`;
    }
    return '';
}
async function deletePost(id) {
    if (!confirm("Delete this post permanently?")) return;
    try {
        await fetch(`http://localhost:3000/posts/${id}`, { method: 'DELETE' });
        savedPosts = savedPosts.filter(p => p.id !== id);
        updateHistory();

        // Redraw main feed
        const container = document.getElementById('postsContainer');
        container.innerHTML = '';
        savedPosts.slice().reverse().forEach(post => renderPost(post));
    } catch (err) {
        alert("Failed to delete post.");
    }
}
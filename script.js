// ==========================================
// 1. INITIALIZATION & DATABASE FETCH
// ==========================================
let savedPosts = [];

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
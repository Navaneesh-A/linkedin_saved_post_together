let savedPosts = [];
let showOnlyReminders = false;

// 1. INITIALIZATION
window.onload = async () => {
    try {
        const response = await fetch('http://localhost:3000/posts');
        savedPosts = await response.json();
        renderAll();
    } catch (error) {
        console.error("Could not load history:", error);
    }
};

// 2. CORE RENDER LOGIC
function renderAll() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    let displayPosts = showOnlyReminders ? savedPosts.filter(p => p.remind) : savedPosts;

    // Make sure this matches the function name above
    displayPosts.forEach(post => renderPost(post));

    updateHistory();
    updateBellBadge();
}
// 3. REMINDER & DELETE ACTIONS
async function toggleRemind(id) {
    if (!id || id.includes('undefined')) return alert("Old post - please delete and re-save.");
    try {
        const res = await fetch(`http://localhost:3000/posts/${id}/remind`, { method: 'PUT' });
        const data = await res.json();
        const post = savedPosts.find(p => p.id === id);
        if (post) post.remind = data.remind;
        renderAll();
    } catch (err) { alert("Failed to update reminder."); }
}

async function deletePost(id) {
    if (!confirm("Delete post permanently?")) return;
    try {
        await fetch(`http://localhost:3000/posts/${id}`, { method: 'DELETE' });
        savedPosts = savedPosts.filter(p => p.id !== id);
        renderAll();
    } catch (err) { alert("Failed to delete."); }
}

function toggleReminderFilter() {
    showOnlyReminders = !showOnlyReminders;
    renderAll();
}

// 4. UI BUILDERS
// function renderPostCard(data, container) {
//     const uniqueId = data.id || Date.now();
//     const isLong = data.text.length > 200;
//     const displayText = isLong ? data.text.substring(0, 200) + '...' : data.text;

//     const postHTML = `
//         <div class="bg-white p-6 rounded-lg shadow relative">
//             <button onclick="toggleRemind('${data.id}')" class="absolute top-4 right-4 text-xl hover:scale-110 transition ${data.remind ? 'text-yellow-500' : 'text-gray-300'}">🔔</button>
//             <h3 class="font-bold text-lg mb-4 text-gray-900">${data.author}</h3>
//             ${renderMedia(data)}

//             <div class="mt-4 text-gray-800 text-sm whitespace-pre-wrap">
//                 <span id="${uniqueId}-short">${displayText}</span>
//                 <span id="${uniqueId}-long" class="hidden">${data.text}</span>
//             </div>

//             ${isLong ? `<button onclick="toggleText('${uniqueId}')" id="${uniqueId}-btn" class="text-blue-600 font-bold mt-2 text-sm hover:underline">Read More</button>` : ''}

//             <a href="${data.originalUrl}" target="_blank" class="text-xs text-gray-400 hover:underline mt-4 block">View Original</a>
//         </div>
//     `;
//     container.insertAdjacentHTML('beforeend', postHTML);
// }
function renderPost(data) {
    const container = document.getElementById('postsContainer');
    const uniqueId = 'post-' + Date.now();

    let rawText = data.text || "";
    let isLong = rawText.length > 250;

    // Force HTML line breaks for exact formatting
    const formattedText = rawText.replace(/\n/g, '<br>');
    const shortText = isLong ? formattedText.substring(0, 300) + '...' : formattedText;

    const postHTML = `
        <div class="bg-white p-6 rounded-lg shadow relative">
            <button onclick="toggleRemind('${data.id}')" class="absolute top-4 right-4 text-xl hover:scale-110 transition ${data.remind ? 'text-yellow-500' : 'text-gray-300'}">🔔</button>
            <h3 class="font-bold text-lg mb-4 text-gray-900">${data.author}</h3>
            
            ${renderMedia(data)}

            <div class="mt-4 text-gray-800 leading-relaxed text-sm">
                <span id="${uniqueId}-short">${shortText}</span>
                <span id="${uniqueId}-long" class="hidden">${formattedText}</span>
            </div>
            
            ${isLong ? `<button onclick="toggleText('${uniqueId}')" id="${uniqueId}-btn" class="text-blue-600 font-bold mt-2 text-sm hover:underline">Read More</button>` : ''}
            
            <a href="${data.originalUrl}" target="_blank" class="text-xs text-gray-400 hover:underline mt-6 block">View Original</a>
        </div>
    `;
    container.insertAdjacentHTML('afterbegin', postHTML);
}
function updateHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    container.innerHTML = '';
    savedPosts.forEach(post => {
        container.innerHTML += `
            <li class="p-3 bg-gray-50 rounded flex justify-between items-center">
                <span class="truncate text-sm">${post.author}</span>
                <button onclick="deletePost('${post.id}')" class="text-red-600">🗑️</button>
            </li>
        `;
    });
}

function updateBellBadge() {
    const badge = document.getElementById('bellBadge');
    const count = savedPosts.filter(p => p.remind).length;
    if (badge) {
        badge.innerText = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

async function fetchAndRender() {
    const res = await fetch('http://localhost:3000/posts');
    savedPosts = await res.json();
    renderAll();
}
function renderMedia(data) {
    return data.mediaUrl ? `<img src="${data.mediaUrl}" class="w-full h-40 object-cover rounded mb-4">` : '';
}
async function savePost() {
    const input = document.getElementById('linkInput');
    const saveBtn = document.getElementById('saveBtn');
    const url = input.value.trim();

    if (!url) return alert("Please enter a URL.");

    saveBtn.innerText = "Scraping...";
    saveBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!response.ok) throw new Error("Scraping failed");

        const data = await response.json();

        // 🎉 Trigger Confetti!
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#0A66C2', '#FFFFFF', '#F8C77E']
        });

        savedPosts.unshift(data);
        renderAll();
        input.value = '';
    } catch (error) {
        console.error("Failed to scrape:", error);
        alert("Scraping failed. Check your server terminal.");
    } finally {
        saveBtn.innerText = "Save";
        saveBtn.disabled = false;
    }
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
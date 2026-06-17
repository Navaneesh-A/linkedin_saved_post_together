async function savePost() {
    const input = document.getElementById('linkInput');
    const url = input.value.trim();

    if (!url) return alert('Please enter a valid URL');

    try {
        const response = await fetch('http://localhost:3000/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        // 🎉 Trigger Joyful Animation!
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#0A66C2', '#FFFFFF', '#F8C77E'] // LinkedIn colors
        });

        renderPost(data);
        input.value = '';
    } catch (error) {
        console.error("Failed to fetch:", error);
        alert("Cannot connect to backend. Is your Node server running?");
    }
}

function renderPost(data) {
    const container = document.getElementById('postsContainer');
    const uniqueId = 'post-' + Date.now();

    // 1. Handle the Read More logic on raw text
    let rawText = data.text || "";
    let isLong = rawText.length > 250;

    let shortText = rawText;
    if (isLong) {
        shortText = rawText.substring(0, 250) + '...';
    }

    // 2. Force HTML line breaks so it looks exactly like the LinkedIn post
    const shortHTML = shortText.replace(/\n/g, '<br>');
    const longHTML = rawText.replace(/\n/g, '<br>');

    const postHTML = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="font-bold text-lg mb-4 text-gray-900">${data.author}</h3>
            
            ${renderMedia(data)}

            <div class="mt-4 text-gray-800 leading-relaxed text-sm">
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
    if (data.mediaUrl) {
        return `<img src="${data.mediaUrl}" class="w-full max-h-[400px] object-contain bg-gray-50 rounded border border-gray-200 mb-4">`;
    }
    return '';
}
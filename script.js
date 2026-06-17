async function savePost() {
    const input = document.getElementById('linkInput');
    const url = input.value.trim();

    if (!url) return alert('Please enter a valid URL');

    try {
        // 1. Send URL to Backend
        const response = await fetch('http://localhost:3000/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        // 2. Render the real response
        renderPost(data);
        input.value = '';
    } catch (error) {
        console.error("Failed to fetch:", error);
        alert("Cannot connect to backend. Is your Node server running?");
    }
}

function renderPost(data) {
    const container = document.getElementById('postsContainer');

    // Force line breaks to render properly in HTML
    const formattedText = data.text.replace(/\n/g, '<br>');

    const postHTML = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="font-bold text-lg mb-4 text-gray-900">${data.author}</h3>
            <p class="text-gray-800 leading-relaxed">${formattedText}</p>
            ${renderMedia(data)}
            <a href="${data.originalUrl}" target="_blank" class="text-sm text-blue-500 hover:underline mt-6 inline-block">View Original on LinkedIn</a>
        </div>
    `;
    container.insertAdjacentHTML('afterbegin', postHTML);
}

function renderMedia(data) {
    // If the backend found an attached image or document thumbnail, render it
    if (data.mediaUrl) {
        return `<div class="mt-6 border-t pt-4">
                    <span class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Attached Media</span>
                    <img src="${data.mediaUrl}" class="w-full max-h-[500px] object-contain bg-gray-50 rounded border border-gray-200 shadow-sm">
                </div>`;
    }
    // If it's a text-only post, return nothing
    return '';
}

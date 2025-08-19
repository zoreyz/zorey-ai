// This file handles the search functionality
const searchBtn = document.getElementById('search-btn');
const searchOverlay = document.getElementById('search-overlay');
const closeSearchBtn = document.getElementById('close-search-btn');
const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results');
const chatContainer = document.getElementById('chat-container');

searchBtn.addEventListener('click', () => {
    searchOverlay.classList.remove('hidden');
    searchInput.focus();
});

closeSearchBtn.addEventListener('click', () => {
    searchOverlay.classList.add('hidden');
    searchInput.value = '';
    searchResultsContainer.innerHTML = '';
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    searchResultsContainer.innerHTML = '';

    const history = JSON.parse(localStorage.getItem('chatHistory')) || [];
    
    if (query.length === 0) return;

    const filteredResults = history.filter(conv => 
        conv.user.toLowerCase().includes(query) || conv.ai.toLowerCase().includes(query)
    );

    if (filteredResults.length === 0) {
        searchResultsContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">Tidak ada hasil ditemukan.</p>`;
        return;
    }

    filteredResults.forEach(conv => {
        const resultItem = document.createElement('div');
        resultItem.classList.add('p-3', 'border-b', 'border-gray-200', 'dark:border-gray-700', 'cursor-pointer', 'hover:bg-gray-100', 'dark:hover:bg-gray-700', 'transition-colors');
        resultItem.innerHTML = `
            <p class="font-bold text-sm text-orange-600 dark:text-orange-400">Anda: <span class="font-normal text-gray-800 dark:text-gray-200">${conv.user.substring(0, 50)}...</span></p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Zorey AI: <span class="font-normal text-gray-500 dark:text-gray-400">${conv.ai.substring(0, 70)}...</span></p>
        `;
        resultItem.addEventListener('click', () => {
            // Re-render chat with selected conversation highlighted
            const chatMessages = chatContainer.querySelectorAll('.message');
            chatMessages.forEach(msg => msg.classList.remove('border-4', 'border-orange-500'));
            
            const conversationIndex = history.findIndex(h => h.id === conv.id);
            if (conversationIndex !== -1) {
                const userMessageEl = chatContainer.children[conversationIndex * 2 + 1];
                const aiMessageEl = chatContainer.children[conversationIndex * 2 + 2];
                
                if (userMessageEl) userMessageEl.classList.add('border-4', 'border-orange-500', 'animate-pulse');
                if (aiMessageEl) aiMessageEl.classList.add('border-4', 'border-orange-500', 'animate-pulse');

                setTimeout(() => {
                    if (userMessageEl) userMessageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
            closeSearchBtn.click();
        });
        searchResultsContainer.appendChild(resultItem);
    });
});

// This API Key should be a Vercel Environment Variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

class ZoreyAI {
    constructor() {
        this.API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-1b-it:generateContent";
        this.API_URL_VISION = "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-1b-it-vision:generateContent";
        
        this.chatHistory = [];
        this.typingIndicatorId = null;
        this.isTyping = false;

        this.elements = {
            chatContainer: document.getElementById('chat-container'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            imageUpload: document.getElementById('image-upload'),
            imageUploadBtn: document.getElementById('image-upload-btn'),
            newChatBtn: document.getElementById('new-chat-btn'),
        };

        this.init();
    }

    init() {
        this.loadChatHistory();
        this.setupEventListeners();
        this.checkInput();
        this.showPWAInstallPrompt();
    }

    setupEventListeners() {
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !this.isTyping) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.elements.userInput.addEventListener('input', () => this.checkInput());
        this.elements.imageUploadBtn.addEventListener('click', () => this.elements.imageUpload.click());
        this.elements.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        this.elements.newChatBtn.addEventListener('click', () => this.startNewChat());
    }

    checkInput() {
        this.elements.sendBtn.disabled = this.elements.userInput.value.trim() === '';
    }

    showPWAInstallPrompt() {
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            Swal.fire({
                title: 'Pasang Zorey AI?',
                text: 'Dapatkan Zorey AI sebagai aplikasi di perangkat Anda untuk akses cepat!',
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#FF6B00',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, Pasang!',
                cancelButtonText: 'Nanti'
            }).then((result) => {
                if (result.isConfirmed) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            Swal.fire('Berhasil!', 'Zorey AI sedang dipasang.', 'success');
                        }
                        deferredPrompt = null;
                    });
                }
            });
        });
    }

    async sendMessage() {
        const textMessage = this.elements.userInput.value.trim();
        const imageFile = this.elements.imageUpload.files[0];

        if ((!textMessage && !imageFile) || this.isTyping) return;

        this.isTyping = true;
        this.elements.sendBtn.disabled = true;

        this.addMessage(textMessage, 'user');
        if (imageFile) {
            this.addMessage(URL.createObjectURL(imageFile), 'user', 'image');
        }
        
        this.elements.userInput.value = '';
        this.elements.imageUpload.value = '';
        
        this.showTypingIndicator();

        try {
            const response = await this.callAPI(textMessage, imageFile);
            this.addMessage(response, 'ai');
            this.saveChatConversation(textMessage, response);
        } catch (error) {
            console.error('API Error:', error);
            this.addMessage('Maaf, terjadi kesalahan. Silakan coba lagi.', 'ai');
        } finally {
            this.isTyping = false;
            this.removeTypingIndicator();
            this.checkInput();
        }
    }

    async callAPI(prompt, imageFile) {
        if (!API_KEY) {
            throw new Error('API Key tidak tersedia.');
        }

        const customPrompt = `Anda adalah Zorey, seorang "Study Coach" profesional. Tugas Anda adalah membantu siswa memahami materi pelajaran, memecahkan masalah, dan meningkatkan kemampuan belajar mereka. Selalu berikan jawaban yang edukatif, terstruktur, dan mudah dipahami. Gunakan bahasa yang ringan, sopan, dan memotivasi. Jawab dalam Bahasa Indonesia.`;

        let url, requestBody;

        if (imageFile) {
            url = `${this.API_URL_VISION}?key=${API_KEY}`;
            const base64Image = await this.fileToBase64(imageFile);
            requestBody = {
                contents: [{
                    parts: [
                        { text: customPrompt + "\n\n" + prompt },
                        { inlineData: { mimeType: imageFile.type, data: base64Image } }
                    ]
                }]
            };
        } else {
            url = `${this.API_URL}?key=${API_KEY}`;
            requestBody = {
                contents: [{
                    parts: [{
                        text: customPrompt + "\n\n" + prompt
                    }]
                }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Gagal memproses permintaan');
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada respons yang diterima';
    }

    addMessage(content, sender, type = 'text') {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`, 'max-w-[85%]', 'p-4', 'rounded-xl', 'shadow-lg', 'transition-all', 'duration-300', 'ease-in-out', 'relative');
        messageDiv.setAttribute('data-aos', 'fade-up');
        
        if (sender === 'user') {
            messageDiv.classList.add('self-end', 'bg-orange-500', 'text-white');
            if (type === 'text') {
                messageDiv.innerHTML = `
                    <p>${content}</p>
                    <div class="flex justify-end mt-4">
                        <button class="text-white opacity-70 hover:opacity-100" title="Salin" onclick="zoreyAI.copyToClipboard(this)">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                `;
            } else if (type === 'image') {
                messageDiv.innerHTML = `<img src="${content}" alt="Gambar pengguna" class="rounded-lg max-w-full">`;
            }
        } else {
            messageDiv.classList.add('self-start', 'bg-yellow-100', 'dark:bg-gray-700');
            messageDiv.innerHTML = `
                <p class="font-bold gradient-text">Zorey AI:</p>
                <div class="mt-2 prose dark:prose-invert">
                    ${this.formatMarkdown(content)}
                </div>
                <div class="flex justify-end mt-4">
                    <button class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Salin" onclick="zoreyAI.copyToClipboard(this)">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
        }
        
        this.elements.chatContainer.appendChild(messageDiv);
        this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    }

    formatMarkdown(text) {
        let html = text
            .replace(/^#\s*(.*$)/gim, '<h1>$1</h1>')
            .replace(/^##\s*(.*$)/gim, '<h2>$1</h2>')
            .replace(/^###\s*(.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/```(.*?)\n(.*?)```/gims, '<pre><code>$2</code></pre>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-500 hover:underline">$1</a>')
            .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
        
        html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
        
        return html;
    }

    showTypingIndicator() {
        if (this.typingIndicatorId) return;

        const typingDiv = document.createElement('div');
        this.typingIndicatorId = 'typing-' + Date.now();
        typingDiv.id = this.typingIndicatorId;
        typingDiv.className = 'message ai-message self-start p-4 rounded-xl shadow-lg bg-yellow-100 dark:bg-gray-700 max-w-[85%]';
        typingDiv.innerHTML = `
            <div class="flex space-x-2">
                <div class="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style="animation-delay: -0.32s"></div>
                <div class="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style="animation-delay: -0.16s"></div>
                <div class="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
            </div>
        `;
        this.elements.chatContainer.appendChild(typingDiv);
        this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const typingElement = document.getElementById(this.typingIndicatorId);
        if (typingElement) {
            typingElement.remove();
            this.typingIndicatorId = null;
        }
    }

    saveChatConversation(userMessage, aiMessage) {
        const conversation = {
            id: Date.now(),
            user: userMessage,
            ai: aiMessage,
            timestamp: new Date().toISOString()
        };
        let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
        history.push(conversation);
        localStorage.setItem('chatHistory', JSON.stringify(history));
    }

    loadChatHistory() {
        const history = JSON.parse(localStorage.getItem('chatHistory')) || [];
        if (history.length > 0) {
            this.elements.chatContainer.innerHTML = '';
            history.forEach(conv => {
                this.addMessage(conv.user, 'user');
                this.addMessage(conv.ai, 'ai');
            });
        }
    }

    startNewChat() {
        Swal.fire({
            title: 'Mulai Obrolan Baru?',
            text: 'Ini akan menghapus semua percakapan saat ini.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#FF6B00',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Mulai!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.elements.chatContainer.innerHTML = `
                    <div class="max-w-[85%] bg-yellow-100 dark:bg-gray-700 p-4 rounded-xl shadow-lg self-start">
                        <p class="font-bold gradient-text">Zorey AI:</p>
                        <p class="text-gray-800 dark:text-gray-200 mt-2">Halo! Obrolan baru telah dimulai. Silakan ajukan pertanyaan Anda.</p>
                        <div class="flex justify-end mt-4">
                            <button class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Salin" onclick="zoreyAI.copyToClipboard(this)">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                `;
                this.chatHistory = [];
                localStorage.removeItem('chatHistory');
                this.elements.userInput.value = '';
                this.elements.imageUpload.value = '';
            }
        });
    }

    copyToClipboard(buttonElement) {
        const messageElement = buttonElement.closest('.message');
        if (!messageElement) return;

        const textToCopy = messageElement.querySelector('p')?.innerText || messageElement.querySelector('.prose')?.innerText;
        if (!textToCopy) return;
        
        navigator.clipboard.writeText(textToCopy.trim())
            .then(() => {
                Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 2000,
                    icon: 'success',
                    title: 'Disalin ke clipboard!'
                });
            })
            .catch(err => {
                console.error('Gagal menyalin:', err);
                Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 2000,
                    icon: 'error',
                    title: 'Gagal menyalin.'
                });
            });
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

}

const zoreyAI = new ZoreyAI();
      

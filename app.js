import { sendChatMessage } from './api.js';

const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const messagesContainer = document.getElementById('messagesContainer');
const typingIndicator = document.getElementById('typingIndicator');

function getCurrentTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(text, sender = 'bot') {
    const group = document.createElement('div');
    group.className = `message-group ${sender}-msg`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = getCurrentTimestamp();

    group.appendChild(bubble);
    group.appendChild(timestamp);

    // Insert above typing indicator
    messagesContainer.insertBefore(group, typingIndicator);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

chatForm.addEventListener('submit', async(e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Render User Message
    appendMessage(text, 'user');
    userInput.value = '';

    // 2. Show Animated Typing State
    typingIndicator.classList.remove('hidden');
    scrollToBottom();

    try {
        // 3. Trigger API Call
        const data = await sendChatMessage(text);

        // Simulate brief network latency feel for natural fluid animation
        setTimeout(() => {
            typingIndicator.classList.add('hidden');
            appendMessage(data.reply, 'bot');
        }, 500);

    } catch (error) {
        typingIndicator.classList.add('hidden');
        appendMessage('Unable to reach the core. Please check your connection.', 'bot');
        console.error(error);
    }
});
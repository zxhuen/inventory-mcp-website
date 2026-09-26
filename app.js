import { sendChatMessage } from './api.js';

const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const messagesContainer = document.getElementById('messagesContainer');
const typingIndicator = document.getElementById('typingIndicator');

function getCurrentTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderInlineMarkdown(container, text) {
    const pattern = /`([^`\n]+)`|\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*([^*\n]+)\*|_([^_\n]+)_/g;
    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
        container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        let element;

        if (match[1] !== undefined) {
            element = document.createElement('code');
            element.textContent = match[1];
        } else if (match[2] !== undefined) {
            const url = safeMarkdownUrl(match[3]);
            if (url) {
                element = document.createElement('a');
                element.href = url;
                element.target = '_blank';
                element.rel = 'noopener noreferrer';
                element.textContent = match[2];
                if (match[4]) element.title = match[4];
            } else {
                element = document.createTextNode(match[2]);
            }
        } else {
            const content = match[5] ?? match[6] ?? match[7] ?? match[8] ?? match[9];
            const isBold = match[5] !== undefined || match[6] !== undefined;
            const tag = isBold ? 'strong' : match[7] !== undefined ? 'del' : 'em';
            element = document.createElement(tag);
            renderInlineMarkdown(element, content);
        }

        container.appendChild(element);
        lastIndex = match.index + match[0].length;
    }

    container.appendChild(document.createTextNode(text.slice(lastIndex)));
}

function safeMarkdownUrl(value) {
    try {
        const url = new URL(value, window.location.href);
        return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

function isMarkdownListItem(line) {
    return /^\s{0,3}(?:[-+*]|\d+[.)])\s+/.test(line);
}

function isMarkdownBlockStart(lines, index) {
    const line = lines[index];
    return /^\s{0,3}(?:#{1,6}\s|>|```|~~~|([-*_])(?:\s*\1){2,}\s*$)/.test(line) ||
        isMarkdownListItem(line);
}

function renderMarkdown(container, text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index++;
            continue;
        }

        const fence = line.match(/^\s{0,3}(```+|~~~+)(.*)$/);
        if (fence) {
            const code = [];
            const fencePattern = new RegExp(`^\\s{0,3}${fence[1][0]}{${fence[1].length},}\\s*$`);
            index++;
            while (index < lines.length && !fencePattern.test(lines[index])) {
                code.push(lines[index++]);
            }
            if (index < lines.length) index++;

            const pre = document.createElement('pre');
            const codeElement = document.createElement('code');
            codeElement.textContent = code.join('\n');
            pre.appendChild(codeElement);
            container.appendChild(pre);
            continue;
        }

        const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (heading) {
            const element = document.createElement(`h${heading[1].length}`);
            renderInlineMarkdown(element, heading[2]);
            container.appendChild(element);
            index++;
            continue;
        }

        if (/^\s{0,3}(?:([-*_])\s*){3,}$/.test(line)) {
            container.appendChild(document.createElement('hr'));
            index++;
            continue;
        }

        if (/^\s*>/.test(line)) {
            const quoteLines = [];
            while (index < lines.length && /^\s*>/.test(lines[index])) {
                quoteLines.push(lines[index++].replace(/^\s*>\s?/, ''));
            }
            const quote = document.createElement('blockquote');
            renderMarkdown(quote, quoteLines.join('\n'));
            container.appendChild(quote);
            continue;
        }

        const tableSeparator = /^\s*\|?\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)*\s*\|?\s*$/;
        if (line.includes('|') && index + 1 < lines.length && tableSeparator.test(lines[index + 1])) {
            const rows = [line];
            index += 2;
            while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
                rows.push(lines[index++]);
            }

            const table = document.createElement('table');
            rows.forEach((row, rowIndex) => {
                const cells = row.trim().replace(/^\||\|$/g, '').split('|');
                const tr = document.createElement('tr');
                for (const cell of cells) {
                    const cellElement = document.createElement(rowIndex === 0 ? 'th' : 'td');
                    renderInlineMarkdown(cellElement, cell.trim());
                    tr.appendChild(cellElement);
                }
                const section = rowIndex === 0 ? table.createTHead() : table.createTBody();
                section.appendChild(tr);
            });
            container.appendChild(table);
            continue;
        }

        if (isMarkdownListItem(line)) {
            const ordered = /^\s{0,3}\d+[.)]\s+/.test(line);
            const list = document.createElement(ordered ? 'ol' : 'ul');
            while (index < lines.length && isMarkdownListItem(lines[index]) &&
                /^\s{0,3}\d+[.)]\s+/.test(lines[index]) === ordered) {
                const itemMatch = lines[index].match(/^\s{0,3}(?:[-+*]|\d+[.)])\s+(.*)$/);
                const item = document.createElement('li');
                renderInlineMarkdown(item, itemMatch[1]);
                index++;

                while (index < lines.length && lines[index].trim() &&
                    /^\s{2,}/.test(lines[index]) && !isMarkdownListItem(lines[index])) {
                    item.appendChild(document.createElement('br'));
                    renderInlineMarkdown(item, lines[index].trim());
                    index++;
                }
                list.appendChild(item);
            }
            container.appendChild(list);
            continue;
        }

        const paragraph = [];
        while (index < lines.length && lines[index].trim() &&
            (paragraph.length === 0 || !isMarkdownBlockStart(lines, index))) {
            paragraph.push(lines[index++].trim());
        }
        const element = document.createElement('p');
        renderInlineMarkdown(element, paragraph.join(' '));
        container.appendChild(element);
    }
}

function appendMessage(text, sender = 'bot') {
    const group = document.createElement('div');
    group.className = `message-group ${sender}-msg`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    if (sender === 'bot') {
        bubble.classList.add('markdown-content');
        renderMarkdown(bubble, text);
    } else {
        bubble.textContent = text;
    }

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
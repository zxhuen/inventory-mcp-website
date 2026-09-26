/**
 * Standalone API Module
 * Handles message payloads and communicates with remote endpoints or AI runtimes.
 */
export async function sendChatMessage(prompt) {
    const endpoint = new URL('http://127.0.0.1:8000/Chat/assistant');
    endpoint.searchParams.set('message', prompt);

    const response = await fetch(endpoint, { method: 'POST' });

    if (!response.ok) {
        throw new Error(`Chat API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let reply;

    if (typeof data === 'string') {
        reply = data;
    } else if (data && data.reply) {
        reply = data.reply;
    } else if (data && data.response) {
        reply = data.response;
    } else if (data) {
        reply = data.message;
    }


    if (typeof reply !== 'string') {
        throw new Error('Chat API returned an unexpected response format.');
    }

    return { reply };
}
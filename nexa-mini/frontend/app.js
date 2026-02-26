const API_URL = 'http://localhost:8000';

// DOM Elements
const activeUsersEl = document.getElementById('active-users');
const totalQueriesEl = document.getElementById('total-queries');
const apiLatencyEl = document.getElementById('api-latency');
const chatMessagesEl = document.getElementById('chat-messages');
const userInputEl = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const refreshBtn = document.getElementById('refresh-stats');

// Functions
async function fetchStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (!response.ok) throw new Error('API offline');
        const data = await response.json();

        activeUsersEl.textContent = data.active_users;
        totalQueriesEl.textContent = data.total_queries.toLocaleString();
        apiLatencyEl.textContent = data.api_latency;
    } catch (err) {
        console.error('Error fetching stats:', err);
        activeUsersEl.textContent = 'Offline';
        totalQueriesEl.textContent = 'Offline';
        apiLatencyEl.textContent = 'Error';
    }
}

function addMessage(text, role, thinkingSteps = []) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', role);

    let content = `<div class="text">${text}</div>`;

    if (thinkingSteps.length > 0) {
        content += `<div class="thinking-steps">`;
        thinkingSteps.forEach(step => {
            content += `<div class="step">${step}</div>`;
        });
        content += `</div>`;
    }

    msgDiv.innerHTML = content;
    chatMessagesEl.appendChild(msgDiv);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function handleSendMessage() {
    const text = userInputEl.value.trim();
    if (!text) return;

    // Clear input
    userInputEl.value = '';

    // Add user message
    addMessage(text, 'user');

    try {
        // Show "thinking" message
        const thinkingId = Date.now();
        const thinkingDiv = document.createElement('div');
        thinkingDiv.classList.add('message', 'system');
        thinkingDiv.id = `thinking-${thinkingId}`;
        thinkingDiv.textContent = 'Nexa is thinking...';
        chatMessagesEl.appendChild(thinkingDiv);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

        const response = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        // Remove thinking message
        document.getElementById(`thinking-${thinkingId}`).remove();

        if (!response.ok) throw new Error('Query failed');

        const data = await response.json();
        addMessage(data.answer, 'ai', data.thinking_process);

        // Update stats after a query
        fetchStats();
    } catch (err) {
        console.error('Error sending message:', err);
        addMessage('Sorry, I am having trouble connecting to the backend. Please make sure the FastAPI server is running.', 'system');
    }
}

// Event Listeners
sendBtn.addEventListener('click', handleSendMessage);
userInputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
});
refreshBtn.addEventListener('click', fetchStats);

// Initial Load
fetchStats();
// Auto-refresh stats every 30 seconds
setInterval(fetchStats, 30000);

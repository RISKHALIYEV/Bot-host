/**
 * Bot Host Dashboard - Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elementlari
    const backendUrlInput = document.getElementById('backend-url');
    const saveUrlBtn = document.getElementById('save-url-btn');
    const connectionDot = document.getElementById('connection-dot');
    const connectionText = document.getElementById('connection-text');
    
    const deployForm = document.getElementById('deploy-form');
    const projectNameInput = document.getElementById('project-name');
    const pyFileInput = document.getElementById('py-file');
    const pyFileName = document.getElementById('py-file-name');
    const reqFileInput = document.getElementById('req-file');
    const reqFileName = document.getElementById('req-file-name');
    
    const botStatusDot = document.getElementById('bot-status-dot');
    const botStatusText = document.getElementById('bot-status-text');
    const uptimeDisplay = document.getElementById('uptime-display');
    const consoleLogs = document.getElementById('console-logs');
    const clearLogsBtn = document.getElementById('clear-logs');
    
    const btnDeploy = document.getElementById('btn-deploy');
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const btnRestart = document.getElementById('btn-restart');
    const btnDelete = document.getElementById('btn-delete');
    const toastContainer = document.getElementById('toast-container');

    // Holat o'zgaruvchilari
    let backendUrl = localStorage.getItem('bot_host_backend_url') || 'http://localhost:5000';
    backendUrlInput.value = backendUrl;

    let statusCheckInterval = null;
    let logsCheckInterval = null;
    let uptimeSeconds = 0;
    let uptimeInterval = null;

    // --- Toast Notifications ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium shadow-2xl transition-all transform translate-y-2 opacity-0 border`;
        
        if (type === 'success') {
            toast.className += ' bg-emerald-950/90 border-emerald-500/40 text-emerald-200';
            toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> ${message}`;
        } else if (type === 'error') {
            toast.className += ' bg-red-950/90 border-red-500/40 text-red-200';
            toast.innerHTML = `<i class="fa-solid fa-circle-xmark text-red-400"></i> ${message}`;
        } else {
            toast.className += ' bg-dark-800 border-dark-600 text-gray-200';
            toast.innerHTML = `<i class="fa-solid fa-circle-info text-accent-500"></i> ${message}`;
        }

        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        }, 10);

        setTimeout(() => {
            toast.classList.add('translate-y-2', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // --- Logger ---
    function appendLog(text, type = 'normal') {
        const div = document.createElement('div');
        let colorClass = 'text-gray-300';
        if (type === 'error') colorClass = 'text-red-400';
        if (type === 'success') colorClass = 'text-emerald-400';
        if (type === 'accent') colorClass = 'text-accent-500';
        
        div.className = colorClass;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        consoleLogs.appendChild(div);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }

    clearLogsBtn.addEventListener('click', () => {
        consoleLogs.innerHTML = '';
        appendLog('Console tozalandi.', 'accent');
    });

    // --- Fayl nomlarini ko'rsatish ---
    pyFileInput.addEventListener('change', () => {
        if (pyFileInput.files.length > 0) {
            pyFileName.textContent = pyFileInput.files[0].name;
            pyFileName.className = 'text-xs text-accent-500 font-medium truncate max-w-full';
        } else {
            pyFileName.textContent = 'Fayl tanlash (.py)';
            pyFileName.className = 'text-xs text-gray-300 font-medium truncate max-w-full';
        }
    });

    reqFileInput.addEventListener('change', () => {
        if (reqFileInput.files.length > 0) {
            reqFileName.textContent = reqFileInput.files[0].name;
            reqFileName.className = 'text-xs text-accent-500 font-medium truncate max-w-full';
        } else {
            reqFileName.textContent = 'Fayl tanlash (.txt)';
            reqFileName.className = 'text-xs text-gray-300 font-medium truncate max-w-full';
        }
    });

    // --- Backend URL Saqlash va Sinash ---
    saveUrlBtn.addEventListener('click', async () => {
        const url = backendUrlInput.value.trim().replace(/\/$/, '');
        if (!url) {
            showToast('Iltimos, to‘g‘ri URL kiriting!', 'error');
            return;
        }
        backendUrl = url;
        localStorage.setItem('bot_host_backend_url', backendUrl);
        showToast('URL saqlandi. Backend tekshirilmoqda...', 'info');
        await checkConnection();
    });

    // --- API So'rovlarni Yuborish Yordamchisi ---
    async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
        const url = `${backendUrl}${endpoint}`;
        const options = {
            method: method,
            headers: {}
        };

        if (body) {
            if (isFormData) {
                options.body = body; // FormData avtomatik Content-Type multipart/form-data ni o'rnatadi
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP xato: ${response.status}`);
            }
            return { success: true, data };
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    }

    // --- Status va Aloqani Tekshirish ---
    async function checkConnection() {
        const res = await apiRequest('/api/status', 'GET');
        
        if (res.success) {
            setConnected(true);
            updateBotStatusUI(res.data.status || 'Stopped', res.data.uptime || 0);
            if (res.data.logs) {
                // Agar backend loglarni qaytarsa
            }
        } else {
            setConnected(false);
            updateBotStatusUI('Disconnected', 0);
        }
    }

    function setConnected(isConnected) {
        if (isConnected) {
            connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 transition-all duration-300 shadow-sm shadow-emerald-500/50';
            connectionText.textContent = 'Connected';
        } else {
            connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-red-500 transition-all duration-300 shadow-sm shadow-red-500/50';
            connectionText.textContent = 'Disconnected';
        }
    }

    function updateBotStatusUI(status, uptimeSec = 0) {
        botStatusText.textContent = status;
        
        if (status.toLowerCase() === 'running') {
            botStatusDot.className = 'w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse';
            startUptimeTimer(uptimeSec);
        } else if (status.toLowerCase() === 'deploying' || status.toLowerCase() === 'starting') {
            botStatusDot.className = 'w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 animate-pulse';
            stopUptimeTimer();
        } else {
            botStatusDot.className = 'w-3 h-3 rounded-full bg-red-500';
            stopUptimeTimer();
        }
    }

    // Uptime taymer
    function startUptimeTimer(initialSeconds = 0) {
        if (uptimeInterval) return;
        uptimeSeconds = initialSeconds;
        uptimeInterval = setInterval(() => {
            uptimeSeconds++;
            const hours = String(Math.floor(uptimeSeconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((uptimeSeconds % 3600) / 60)).padStart(2, '0');
            const seconds = String(uptimeSeconds % 60).padStart(2, '0');
            uptimeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        }, 1000);
    }

    function stopUptimeTimer() {
        if (uptimeInterval) {
            clearInterval(uptimeInterval);
            uptimeInterval = null;
        }
        uptimeDisplay.textContent = '00:00:00';
    }

    // --- Deploy Form Submit ---
    deployForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectName = projectNameInput.value.trim();
        const pyFile = pyFileInput.files[0];
        const reqFile = reqFileInput.files[0];

        if (!pyFile) {
            showToast('Iltimos, Python bot faylini (.py) tanlang!', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('project_name', projectName);
        formData.append('bot_file', pyFile);
        if (reqFile) {
            formData.append('requirements_file', reqFile);
        }

        showToast('Deploy yuborilmoqda...', 'info');
        appendLog(`[Deploy] '${projectName}' uchun fayllar yuklanmoqda...`, 'accent');
        updateBotStatusUI('Deploying');

        const res = await apiRequest('/api/deploy', 'POST', formData, true);

        if (res.success) {
            showToast('Bot muvaffaqiyatli deploy qilindi!', 'success');
            appendLog(`[Deploy] Muvaffaqiyatli yakunlandi.`, 'success');
            updateBotStatusUI('Running');
        } else {
            showToast(`Xatolik: ${res.error}`, 'error');
            appendLog(`[Deploy Xato] ${res.error}`, 'error');
            updateBotStatusUI('Stopped');
        }
    });

    // --- Action Tugmalari (Start, Stop, Restart, Delete, Deploy shortcut) ---
    async function sendAction(actionEndpoint, actionName) {
        showToast(`${actionName} so'rovi yuborilmoqda...`, 'info');
        appendLog(`[Action] ${actionName} bajarilmoqda...`, 'accent');

        const res = await apiRequest(actionEndpoint, 'POST', {});

        if (res.success) {
            showToast(`${actionName} muvaffaqiyatli bajarildi!`, 'success');
            appendLog(`[Action] ${actionName} bajarildi.`, 'success');
            checkConnection();
        } else {
            showToast(`Xatolik: ${res.error}`, 'error');
            appendLog(`[Action Xato] ${res.error}`, 'error');
        }
    }

    btnStart.addEventListener('click', () => sendAction('/api/start', 'Start Bot'));
    btnStop.addEventListener('click', () => sendAction('/api/stop', 'Stop Bot'));
    btnRestart.addEventListener('click', () => sendAction('/api/restart', 'Restart Bot'));
    btnDelete.addEventListener('click', () => {
        if (confirm('Botni o‘chirib yuborishni tasdiqlaysizmi?')) {
            sendAction('/api/stop', 'Delete Bot');
            updateBotStatusUI('Stopped');
        }
    });
    btnDeploy.addEventListener('click', () => {
        deployForm.requestSubmit();
    });

    // --- Logs fetch qilish ---
    async function fetchLogs() {
        const res = await apiRequest('/api/logs', 'GET');
        if (res.success && res.data.logs) {
            // Yangi loglarni qo'shish logikasi
        }
    }

    // Interval tekshiruvlarni boshlash
    checkConnection();
    statusCheckInterval = setInterval(checkConnection, 10000); // Har 10 sekundda statusni tekshirish
});
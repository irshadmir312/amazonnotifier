// Amazon Jobs Monitor - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('statusBadge');
  const totalFoundEl = document.getElementById('totalFound');
  const refreshIntervalEl = document.getElementById('refreshInterval');
  const knownCountEl = document.getElementById('knownCount');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const testBtn = document.getElementById('testBtn');
  const clearLogBtn = document.getElementById('clearLogBtn');
  const jobsList = document.getElementById('jobsList');
  const lastCheckEl = document.getElementById('lastCheck');

  // Settings elements
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsView = document.getElementById('settingsView');
  const mainView = document.getElementById('mainView');
  const settingsBack = document.getElementById('settingsBack');
  const intervalSelect = document.getElementById('intervalSelect');
  const soundToggle = document.getElementById('soundToggle');
  const notifToggle = document.getElementById('notifToggle');
  const autoStartToggle = document.getElementById('autoStartToggle');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  let currentData = null;

  // Load status
  function loadStatus() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting status:', chrome.runtime.lastError);
        return;
      }
      if (!response) return;

      currentData = response;
      updateUI(response);
    });
  }

  function updateUI(data) {
    const { settings, status, totalFound, recentJobs } = data;

    // Status badge
    statusBadge.textContent = status === 'monitoring' ? '● Monitoring' : status === 'stopped' ? 'Stopped' : 'Idle';
    statusBadge.className = 'status-badge ' + (status === 'monitoring' ? 'monitoring' : 'stopped');

    // Stats
    totalFoundEl.textContent = totalFound;
    refreshIntervalEl.textContent = formatInterval(settings.refreshInterval);
    knownCountEl.textContent = recentJobs ? '—' : '0';

    // Buttons
    startBtn.style.display = status === 'monitoring' ? 'none' : 'inline-flex';
    stopBtn.style.display = status === 'monitoring' ? 'inline-flex' : 'none';

    // Jobs list
    if (recentJobs && recentJobs.length > 0) {
      jobsList.innerHTML = recentJobs.map((job, i) => `
        <a href="${job.url}" target="_blank" class="job-item ${i === 0 ? 'new' : ''}">
          <div class="job-icon">📦</div>
          <div class="job-info">
            <div class="job-title">${escapeHtml(job.title)}</div>
            <div class="job-meta">
              <span>${escapeHtml(job.location)}</span>
              ${job.company ? `<span>· ${escapeHtml(job.company)}</span>` : ''}
            </div>
          </div>
          <span class="job-time">${formatTime(job.foundAt)}</span>
        </a>
      `).join('');
    } else {
      jobsList.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
          <p>No new jobs detected yet</p>
          <span class="hint">Start monitoring and keep the Amazon Jobs page open</span>
        </div>
      `;
    }

    // Last check time
    if (recentJobs && recentJobs.length > 0) {
      lastCheckEl.textContent = 'Last found: ' + formatTime(recentJobs[0].foundAt);
    }
  }

  function formatInterval(seconds) {
    if (seconds < 60) return seconds + 's';
    if (seconds < 120) return '1 min';
    return Math.floor(seconds / 60) + ' min';
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffMin < 1440) return Math.floor(diffMin / 60) + 'h ago';
    return date.toLocaleDateString();
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Event Listeners
  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'START_MONITORING' }, () => {
      setTimeout(loadStatus, 500);
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_MONITORING' }, () => {
      setTimeout(loadStatus, 300);
    });
  });

  testBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' }, () => {
      // Brief visual feedback
      testBtn.textContent = '✓ Sent!';
      testBtn.style.color = '#22c55e';
      setTimeout(() => {
        testBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Test`;
        testBtn.style.color = '';
      }, 1500);
    });
  });

  clearLogBtn.addEventListener('click', () => {
    if (confirm('Clear all detected jobs history?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_LOG' }, () => {
        setTimeout(loadStatus, 300);
      });
    }
  });

  // Settings navigation
  settingsToggle.addEventListener('click', () => {
    mainView.style.display = 'none';
    settingsView.style.display = 'block';

    // Populate settings
    if (currentData) {
      intervalSelect.value = currentData.settings.refreshInterval;
      soundToggle.checked = currentData.settings.soundEnabled;
      notifToggle.checked = currentData.settings.desktopNotifications;
      autoStartToggle.checked = currentData.settings.autoStart;
    }
  });

  settingsBack.addEventListener('click', () => {
    settingsView.style.display = 'none';
    mainView.style.display = 'block';
  });

  saveSettingsBtn.addEventListener('click', () => {
    const newSettings = {
      refreshInterval: parseInt(intervalSelect.value),
      soundEnabled: soundToggle.checked,
      desktopNotifications: notifToggle.checked,
      autoStart: autoStartToggle.checked,
    };

    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: newSettings }, () => {
      // Go back to main view
      settingsView.style.display = 'none';
      mainView.style.display = 'block';
      setTimeout(loadStatus, 300);
    });
  });

  // Initial load
  loadStatus();

  // Refresh every 2 seconds while popup is open
  setInterval(loadStatus, 2000);
});
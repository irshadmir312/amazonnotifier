// Amazon Monitor v2 — Popup Script
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // Elements
  const statusBadge = $('statusBadge');
  const totalFoundEl = $('totalFound');
  const jobIntervalEl = $('jobInterval');
  const shiftIntervalEl = $('shiftInterval');
  const startBtn = $('startBtn');
  const stopBtn = $('stopBtn');
  const dismissBtn = $('dismissBtn');
  const itemsList = $('itemsList');
  const mainView = $('mainView');
  const settingsView = $('settingsView');
  const lastCheckEl = $('lastCheck');

  let currentData = null;
  let activeFilter = 'all';

  // ─── LOAD STATUS ───
  function loadStatus() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      if (chrome.runtime.lastError || !res) return;
      currentData = res;
      updateUI(res);
    });
  }

  function updateUI(data) {
    const { settings, status, totalFound, recentItems } = data;

    statusBadge.textContent = status === 'monitoring' ? '● Monitoring' : status === 'stopped' ? 'Stopped' : 'Idle';
    statusBadge.className = 'status-badge ' + (status === 'monitoring' ? 'monitoring' : 'stopped');

    totalFoundEl.textContent = totalFound;
    jobIntervalEl.textContent = fmtInterval(settings.jobsRefreshInterval);
    shiftIntervalEl.textContent = fmtInterval(settings.shiftsRefreshInterval);

    startBtn.style.display = status === 'monitoring' ? 'none' : 'inline-flex';
    stopBtn.style.display = status === 'monitoring' ? 'inline-flex' : 'none';

    // Toggles
    $('jobsToggle').checked = settings.jobsEnabled;
    $('shiftsToggle').checked = settings.shiftsEnabled;

    // Items list
    renderItems(recentItems || []);

    if (recentItems && recentItems.length > 0) {
      lastCheckEl.textContent = 'Last: ' + fmtTime(recentItems[0].foundAt);
    }
  }

  function renderItems(items) {
    let filtered = items;
    if (activeFilter !== 'all') {
      filtered = items.filter(i => i.pageType === activeFilter);
    }

    if (filtered.length === 0) {
      itemsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>${activeFilter === 'all' ? 'No new items' : `No new ${activeFilter}`}</p>
          <span>Start monitoring and keep Amazon pages open</span>
        </div>`;
      return;
    }

    itemsList.innerHTML = filtered.map(item => `
      <a href="${item.url}" target="_blank" class="item-card ${item.pageType || 'job'}">
        <span class="item-type">${item.pageType === 'shifts' ? 'SHIFT' : 'JOB'}</span>
        <div class="item-info">
          <div class="item-title">${esc(item.title)}</div>
          <div class="item-meta">
            ${esc(item.location)}
            ${item.company ? ` · ${esc(item.company)}` : ''}
          </div>
        </div>
        <span class="item-time">${fmtTime(item.foundAt)}</span>
      </a>
    `).join('');
  }

  // ─── TABS ───
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.tab;
      if (currentData) renderItems(currentData.recentItems || []);
    });
  });

  // ─── CONTROLS ───
  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'START_MONITORING' }, () => setTimeout(loadStatus, 500));
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_MONITORING' }, () => setTimeout(loadStatus, 300));
  });

  dismissBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'DISMISS_ALERTS' });
    dismissBtn.textContent = '✅ Muted';
    setTimeout(() => dismissBtn.textContent = '🔇 Mute', 1500);
  });

  // Monitor toggles
  $('jobsToggle').addEventListener('change', (e) => {
    if (currentData) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { jobsEnabled: e.target.checked }
      });
    }
  });

  $('shiftsToggle').addEventListener('change', (e) => {
    if (currentData) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { shiftsEnabled: e.target.checked }
      });
    }
  });

  // Test sounds
  $('testJobBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TEST_SOUND', soundType: 'job' });
  });

  $('testShiftBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TEST_SOUND', soundType: 'shift' });
  });

  // ─── SETTINGS NAVIGATION ───
  $('settingsToggle').addEventListener('click', () => {
    mainView.style.display = 'none';
    settingsView.style.display = 'block';
    populateSettings();
  });

  $('settingsBack').addEventListener('click', () => {
    settingsView.style.display = 'none';
    mainView.style.display = 'block';
  });

  function populateSettings() {
    if (!currentData) return;
    const s = currentData.settings;
    $('soundToggle').checked = s.soundEnabled;
    $('volumeRange').value = s.volume;
    $('volumeValue').textContent = s.volume + '%';
    $('beepCount').value = s.beepCount;
    $('beepSpeed').value = s.beepSpeed;
    $('repeatToggle').checked = s.repeatAlerts;
    $('repeatInterval').value = s.repeatIntervalSeconds;
    $('maxRepeats').value = s.maxRepeats;
    $('jobsRefresh').value = s.jobsRefreshInterval;
    $('shiftsRefresh').value = s.shiftsRefreshInterval;
    $('keywordFilter').value = s.keywordFilter || '';
    $('keywordMode').value = s.keywordMode || 'include';
    $('notifToggle').checked = s.desktopNotifications;
    $('flashToggle').checked = s.tabFlashing;
    $('autoOpenToggle').checked = s.autoOpenTab;
    $('overlayToggle').checked = s.showOverlay;
    $('autoStartToggle').checked = s.autoStart;
  }

  $('volumeRange').addEventListener('input', (e) => {
    $('volumeValue').textContent = e.target.value + '%';
  });

  $('saveSettingsBtn').addEventListener('click', () => {
    const newSettings = {
      soundEnabled: $('soundToggle').checked,
      volume: parseInt($('volumeRange').value),
      beepCount: parseInt($('beepCount').value),
      beepSpeed: parseInt($('beepSpeed').value),
      repeatAlerts: $('repeatToggle').checked,
      repeatIntervalSeconds: parseInt($('repeatInterval').value),
      maxRepeats: parseInt($('maxRepeats').value),
      jobsRefreshInterval: parseInt($('jobsRefresh').value),
      shiftsRefreshInterval: parseInt($('shiftsRefresh').value),
      keywordFilter: $('keywordFilter').value,
      keywordMode: $('keywordMode').value,
      desktopNotifications: $('notifToggle').checked,
      tabFlashing: $('flashToggle').checked,
      autoOpenTab: $('autoOpenToggle').checked,
      showOverlay: $('overlayToggle').checked,
      autoStart: $('autoStartToggle').checked,
    };

    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: newSettings }, () => {
      settingsView.style.display = 'none';
      mainView.style.display = 'block';
      setTimeout(loadStatus, 300);
    });
  });

  $('clearLogBtn').addEventListener('click', () => {
    if (confirm('Clear all detection history?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_LOG' }, () => setTimeout(loadStatus, 300));
    }
  });

  // ─── HELPERS ───
  function fmtInterval(s) {
    if (s < 60) return s + 's';
    return Math.floor(s / 60) + 'm';
  }

  function fmtTime(iso) {
    if (!iso) return '';
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return 'now';
    if (m < 60) return m + 'm';
    if (m < 1440) return Math.floor(m / 60) + 'h';
    return new Date(iso).toLocaleDateString();
  }

  function esc(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  // ─── INIT ───
  loadStatus();
  setInterval(loadStatus, 2000);
});
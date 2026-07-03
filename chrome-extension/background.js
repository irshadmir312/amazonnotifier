// Amazon Jobs Monitor - Background Service Worker

const ALARM_NAME = 'amazon-jobs-refresh';
const STORAGE_KEYS = {
  KNOWN_JOBS: 'knownJobs',
  SETTINGS: 'settings',
  NEW_JOBS_LOG: 'newJobsLog',
  STATUS: 'monitorStatus',
  TOTAL_FOUND: 'totalJobsFound',
};

const DEFAULT_SETTINGS = {
  refreshInterval: 30, // seconds
  soundEnabled: true,
  desktopNotifications: true,
  emailEnabled: false,
  emailTo: '',
  autoStart: true,
  filterKeywords: '',
};

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  if (!existing[STORAGE_KEYS.SETTINGS]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
  }
  await chrome.storage.local.set({
    [STORAGE_KEYS.KNOWN_JOBS]: [],
    [STORAGE_KEYS.NEW_JOBS_LOG]: [],
    [STORAGE_KEYS.STATUS]: 'idle',
    [STORAGE_KEYS.TOTAL_FOUND]: 0,
  });

  // Auto-start if enabled
  const settings = await getSettings();
  if (settings.autoStart) {
    startMonitoring();
  }
});

// Get settings from storage
async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
}

// Start the monitoring alarm
async function startMonitoring() {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: settings.refreshInterval / 60,
  });
  await chrome.storage.local.set({ [STORAGE_KEYS.STATUS]: 'monitoring' });
  updateBadge(0);
  console.log(`[Amazon Jobs Monitor] Started. Refreshing every ${settings.refreshInterval}s`);
}

// Stop monitoring
async function stopMonitoring() {
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.storage.local.set({ [STORAGE_KEYS.STATUS]: 'stopped' });
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  console.log('[Amazon Jobs Monitor] Stopped.');
}

// Update badge count
function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF9900' }); // Amazon orange
}

// Handle alarm ticks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  // Find the Amazon jobs tab
  const tabs = await chrome.tabs.query({ url: 'https://www.jobsatamazon.co.uk/*' });
  if (tabs.length === 0) {
    console.log('[Amazon Jobs Monitor] No Amazon jobs tab found. Skipping refresh.');
    return;
  }

  const tab = tabs[0];
  console.log(`[Amazon Jobs Monitor] Refreshing tab ${tab.id}...`);

  // Tell content script to scrape current jobs before refresh
  try {
    const existingJobs = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOBS' });
    if (existingJobs && existingJobs.jobs) {
      await compareAndNotify(existingJobs.jobs);
    }
  } catch (e) {
    // Content script might not be ready
    console.log('[Amazon Jobs Monitor] Could not scrape before refresh:', e.message);
  }

  // Refresh the page
  await chrome.tabs.reload(tab.id);
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOBS_SCRAPE_RESULT') {
    handleScrapedJobs(message.jobs);
    sendResponse({ received: true });
  }
  if (message.type === 'GET_STATUS') {
    getSettings().then(settings => {
      chrome.storage.local.get([
        STORAGE_KEYS.STATUS,
        STORAGE_KEYS.TOTAL_FOUND,
        STORAGE_KEYS.NEW_JOBS_LOG,
      ]).then(data => {
        sendResponse({
          settings,
          status: data[STORAGE_KEYS.STATUS] || 'idle',
          totalFound: data[STORAGE_KEYS.TOTAL_FOUND] || 0,
          recentJobs: (data[STORAGE_KEYS.NEW_JOBS_LOG] || []).slice(0, 50),
        });
      });
    });
    return true; // async response
  }
  if (message.type === 'START_MONITORING') {
    startMonitoring().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'STOP_MONITORING') {
    stopMonitoring().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'UPDATE_SETTINGS') {
    updateSettings(message.settings).then(() => {
      // Restart alarm with new interval if monitoring
      return chrome.storage.local.get(STORAGE_KEYS.STATUS);
    }).then(async (data) => {
      if (data[STORAGE_KEYS.STATUS] === 'monitoring') {
        await startMonitoring();
      }
      sendResponse({ success: true });
    });
    return true;
  }
  if (message.type === 'CLEAR_LOG') {
    chrome.storage.local.set({
      [STORAGE_KEYS.NEW_JOBS_LOG]: [],
      [STORAGE_KEYS.TOTAL_FOUND]: 0,
    }).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'TEST_NOTIFICATION') {
    showNotification('Test Notification', 'This is a test notification from Amazon Jobs Monitor!');
    sendResponse({ success: true });
    return true;
  }
});

// Handle scraped jobs from content script
async function handleScrapedJobs(jobs) {
  if (!jobs || jobs.length === 0) return;
  await compareAndNotify(jobs);
}

// Compare jobs and notify if new ones found
async function compareAndNotify(currentJobs) {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.KNOWN_JOBS,
    STORAGE_KEYS.NEW_JOBS_LOG,
    STORAGE_KEYS.TOTAL_FOUND,
    STORAGE_KEYS.SETTINGS,
  ]);

  const knownJobs = new Set(data[STORAGE_KEYS.KNOWN_JOBS] || []);
  const log = data[STORAGE_KEYS.NEW_JOBS_LOG] || [];
  const totalFound = data[STORAGE_KEYS.TOTAL_FOUND] || 0;
  const settings = { ...DEFAULT_SETTINGS, ...data[STORAGE_KEYS.SETTINGS] };

  const newJobs = currentJobs.filter(job => !knownJobs.has(job.id));

  if (newJobs.length === 0) {
    console.log(`[Amazon Jobs Monitor] No new jobs. Total known: ${knownJobs.size}`);
    return;
  }

  console.log(`[Amazon Jobs Monitor] Found ${newJobs.length} new job(s)!`);

  // Update known jobs
  const newKnownJobs = new Set(knownJobs);
  const newLog = [...log];
  const timestamp = new Date().toISOString();

  newJobs.forEach(job => {
    newKnownJobs.add(job.id);
    newLog.unshift({
      ...job,
      foundAt: timestamp,
    });
  });

  // Keep only last 100 entries in log
  const trimmedLog = newLog.slice(0, 100);

  await chrome.storage.local.set({
    [STORAGE_KEYS.KNOWN_JOBS]: Array.from(newKnownJobs),
    [STORAGE_KEYS.NEW_JOBS_LOG]: trimmedLog,
    [STORAGE_KEYS.TOTAL_FOUND]: totalFound + newJobs.length,
  });

  // Update badge
  updateBadge(newJobs.length);

  // Send notifications
  if (settings.desktopNotifications) {
    const titles = newJobs.map(j => j.title).join(', ');
    showNotification(
      `${newJobs.length} New Job${newJobs.length > 1 ? 's' : ''} Found!`,
      titles.length > 200 ? titles.substring(0, 200) + '...' : titles
    );
  }

  // Play sound via content script
  if (settings.soundEnabled) {
    const tabs = await chrome.tabs.query({ url: 'https://www.jobsatamazon.co.uk/*' });
    if (tabs.length > 0) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, { type: 'PLAY_SOUND' });
      } catch (e) {
        console.log('[Amazon Jobs Monitor] Could not play sound:', e.message);
      }
    }
  }

  // Reset badge after 10 seconds
  setTimeout(() => {
    chrome.action.getBadgeText({}, (text) => {
      if (text) updateBadge(0);
    });
  }, 10000);
}

// Show desktop notification
function showNotification(title, body) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `🚀 ${title}`,
    message: body,
    priority: 2,
    requireInteraction: true,
  });
}

// Update settings
async function updateSettings(newSettings) {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged });
}
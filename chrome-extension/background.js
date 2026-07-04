// Amazon Jobs & Shifts Monitor v2 — Background Service Worker

const ALARM_NAME = 'amazon-monitor-refresh';
const ALARM_NAME_SHIFT = 'amazon-monitor-shift-refresh';
const STORAGE_KEYS = {
  KNOWN_JOBS: 'knownJobs',
  KNOWN_SHIFTS: 'knownShifts',
  SETTINGS: 'settings',
  NEW_ITEMS_LOG: 'newItemsLog',
  STATUS: 'monitorStatus',
  TOTAL_FOUND: 'totalFound',
};

const DEFAULT_SETTINGS = {
  // Jobs
  jobsEnabled: true,
  jobsRefreshInterval: 30,
  // Shifts
  shiftsEnabled: true,
  shiftsRefreshInterval: 60,
  // Alerts
  volume: 100,
  beepCount: 5,
  beepSpeed: 200,
  repeatAlerts: true,
  repeatIntervalSeconds: 30,
  maxRepeats: 5,
  desktopNotifications: true,
  tabFlashing: true,
  autoOpenTab: true,
  // Filtering
  keywordFilter: '',
  keywordMode: 'include', // 'include' or 'exclude'
  // General
  autoStart: true,
  showOverlay: true,
  soundEnabled: true,
};

// ─── INSTALL ───
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  if (!existing[STORAGE_KEYS.SETTINGS]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
  }
  await chrome.storage.local.set({
    [STORAGE_KEYS.KNOWN_JOBS]: [],
    [STORAGE_KEYS.KNOWN_SHIFTS]: [],
    [STORAGE_KEYS.NEW_ITEMS_LOG]: [],
    [STORAGE_KEYS.STATUS]: 'idle',
    [STORAGE_KEYS.TOTAL_FOUND]: 0,
  });
  const settings = await getSettings();
  if (settings.autoStart) startAllMonitoring();
});

// ─── HELPERS ───
async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
}

function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count > 99 ? '99+' : count) });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
}

// ─── MONITORING CONTROL ───
async function startAllMonitoring() {
  const settings = await getSettings();
  if (settings.jobsEnabled) startJobsMonitoring(settings);
  if (settings.shiftsEnabled) startShiftsMonitoring(settings);
  await chrome.storage.local.set({ [STORAGE_KEYS.STATUS]: 'monitoring' });
  updateBadge(0);
  console.log('[Monitor] All monitoring started');
}

function stopAllMonitoring() {
  chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.clear(ALARM_NAME_SHIFT);
  chrome.storage.local.set({ [STORAGE_KEYS.STATUS]: 'stopped' });
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF9900' });
  console.log('[Monitor] All monitoring stopped');
}

async function startJobsMonitoring(settings) {
  if (!settings) settings = await getSettings();
  if (!settings.jobsEnabled) return;
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: settings.jobsRefreshInterval / 60,
  });
  console.log(`[Monitor] Jobs: every ${settings.jobsRefreshInterval}s`);
}

async function startShiftsMonitoring(settings) {
  if (!settings) settings = await getSettings();
  if (!settings.shiftsEnabled) return;
  await chrome.alarms.clear(ALARM_NAME_SHIFT);
  await chrome.alarms.create(ALARM_NAME_SHIFT, {
    periodInMinutes: settings.shiftsRefreshInterval / 60,
  });
  console.log(`[Monitor] Shifts: every ${settings.shiftsRefreshInterval}s`);
}

// ─── AUTO-OPEN TAB ───
async function ensureTabExists(urlPattern) {
  const settings = await getSettings();
  if (!settings.autoOpenTab) return null;

  const tabs = await chrome.tabs.query({ url: urlPattern });
  if (tabs.length > 0) return tabs[0];

  // Open new tab
  const tab = await chrome.tabs.create({ url: urlPattern, active: false });
  console.log(`[Monitor] Opened new tab: ${urlPattern}`);
  return tab;
}

// ─── ALARM HANDLER ───
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await handleJobsAlarm();
  } else if (alarm.name === ALARM_NAME_SHIFT) {
    await handleShiftsAlarm();
  }
});

async function handleJobsAlarm() {
  const JOBS_URL = 'https://www.jobsatamazon.co.uk/app#/jobSearch';
  try {
    const tab = await ensureTabExists('https://www.jobsatamazon.co.uk/*');
    if (!tab) return;

    // Scrape before refresh
    let existingJobs = [];
    try {
      existingJobs = await chrome.tabs.sendMessage(tab.id, {
        type: 'SCRAPE_JOBS',
        pageType: 'jobs',
      });
    } catch (e) { /* content script not ready */ }

    // Refresh
    await chrome.tabs.reload(tab.id);
    console.log('[Monitor] Jobs page refreshed');
  } catch (e) {
    console.error('[Monitor] Jobs alarm error:', e);
  }
}

async function handleShiftsAlarm() {
  const SHIFT_URL = 'https://www.jobsatamazon.co.uk/selfservice/schedule/current-schedule/';
  try {
    const tab = await ensureTabExists('https://www.jobsatamazon.co.uk/selfservice/*');
    if (!tab) return;

    let existingShifts = [];
    try {
      existingShifts = await chrome.tabs.sendMessage(tab.id, {
        type: 'SCRAPE_JOBS',
        pageType: 'shifts',
      });
    } catch (e) { /* content script not ready */ }

    await chrome.tabs.reload(tab.id);
    console.log('[Monitor] Shifts page refreshed');
  } catch (e) {
    console.error('[Monitor] Shifts alarm error:', e);
  }
}

// ─── MESSAGE HANDLER (from content script) ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ITEMS_FOUND') {
    processFoundItems(message.items, message.pageType, sender.tab?.id);
    sendResponse({ received: true });
  }
  if (message.type === 'GET_STATUS') {
    getFullStatus().then(sendResponse);
    return true;
  }
  if (message.type === 'START_MONITORING') {
    startAllMonitoring().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'STOP_MONITORING') {
    stopAllMonitoring();
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'DISMISS_ALERTS') {
    chrome.alarms.clear('repeat-alert');
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'UPDATE_SETTINGS') {
    updateAndRestart(message.settings).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'CLEAR_LOG') {
    chrome.storage.local.set({
      [STORAGE_KEYS.NEW_ITEMS_LOG]: [],
      [STORAGE_KEYS.TOTAL_FOUND]: 0,
      [STORAGE_KEYS.KNOWN_JOBS]: [],
      [STORAGE_KEYS.KNOWN_SHIFTS]: [],
    }).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'TEST_SOUND') {
    playTestSound(message.soundType || 'job');
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'REMOVE_ITEM') {
    removeItemFromLog(message.itemId).then(sendResponse);
    return true;
  }
});

// ─── PROCESS FOUND ITEMS ───
async function processFoundItems(items, pageType, tabId) {
  if (!items || items.length === 0) return;

  const settings = await getSettings();
  const storageKey = pageType === 'shifts' ? STORAGE_KEYS.KNOWN_SHIFTS : STORAGE_KEYS.KNOWN_JOBS;
  const data = await chrome.storage.local.get([storageKey, STORAGE_KEYS.NEW_ITEMS_LOG, STORAGE_KEYS.TOTAL_FOUND]);

  const knownIds = new Set(data[storageKey] || []);
  const log = data[STORAGE_KEYS.NEW_ITEMS_LOG] || [];
  const totalFound = data[STORAGE_KEYS.TOTAL_FOUND] || 0;

  // Filter by keywords
  let newItems = items.filter(item => !knownIds.has(item.id));

  if (newItems.length === 0 && pageType === 'jobs') {
    // First load — just store known items, don't alert
    const allIds = items.map(i => i.id);
    await chrome.storage.local.set({ [storageKey]: allIds });
    return;
  }

  // Apply keyword filter
  if (settings.keywordFilter.trim()) {
    const keywords = settings.keywordFilter.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    newItems = newItems.filter(item => {
      const text = `${item.title} ${item.location} ${item.description || ''}`.toLowerCase();
      if (settings.keywordMode === 'include') {
        return keywords.some(kw => text.includes(kw));
      } else {
        return !keywords.some(kw => text.includes(kw));
      }
    });
  }

  if (newItems.length === 0) return;

  console.log(`[Monitor] Found ${newItems.length} NEW ${pageType}!`);

  // Update storage
  const newKnown = new Set(knownIds);
  const newLog = [...log];
  const timestamp = new Date().toISOString();

  newItems.forEach(item => {
    newKnown.add(item.id);
    newLog.unshift({ ...item, pageType, foundAt: timestamp, dismissed: false });
  });

  await chrome.storage.local.set({
    [storageKey]: Array.from(newKnown),
    [STORAGE_KEYS.NEW_ITEMS_LOG]: newLog.slice(0, 200),
    [STORAGE_KEYS.TOTAL_FOUND]: totalFound + newItems.length,
  });

  // Update badge
  const undismissedCount = newLog.filter(i => !i.dismissed).length;
  updateBadge(undismissedCount);

  // Flash tab title
  if (settings.tabFlashing && tabId) {
    startTabFlashing(tabId, newItems.length, pageType);
  }

  // Desktop notification
  if (settings.desktopNotifications) {
    const titles = newItems.map(i => i.title).join(', ');
    const label = pageType === 'shifts' ? '🟢 New Shift' : '🟠 New Job';
    showNotification(
      `${label}${newItems.length > 1 ? `s (${newItems.length})` : ''} Found!`,
      titles.length > 250 ? titles.substring(0, 250) + '...' : titles,
      newItems[0]?.url || ''
    );
  }

  // Play loud sound
  if (settings.soundEnabled) {
    const tabs = await chrome.tabs.query({ url: 'https://www.jobsatamazon.co.uk/*' });
    if (tabs.length > 0) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'PLAY_ALERT_SOUND',
          soundType: pageType === 'shifts' ? 'shift' : 'job',
          count: settings.beepCount,
          speed: settings.beepSpeed,
          volume: settings.volume / 100,
        });
      } catch (e) {
        console.error('[Monitor] Sound error:', e);
      }
    }
  }

  // Schedule repeat alerts
  if (settings.repeatAlerts && settings.maxRepeats > 0) {
    scheduleRepeatAlert(settings.repeatIntervalSeconds, settings.maxRepeats);
  }

  // Update overlay on page
  const tabs = await chrome.tabs.query({ url: 'https://www.jobsatamazon.co.uk/*' });
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_OVERLAY',
        newCount: newItems.length,
        pageType,
        items: newItems,
      });
    } catch (e) { /* ignore */ }
  }
}

// ─── TAB FLASHING ───
let flashInterval = null;
let flashState = false;

function startTabFlashing(tabId, count, pageType) {
  const label = pageType === 'shifts' ? `🟢 ${count} NEW SHIFT${count > 1 ? 'S' : ''}` : `🟠 ${count} NEW JOB${count > 1 ? 'S' : ''}`;
  flashState = false;
  if (flashInterval) clearInterval(flashInterval);
  flashInterval = setInterval(() => {
    flashState = !flashState;
    const title = flashState ? label : 'Amazon Jobs';
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        clearInterval(flashInterval);
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId },
        func: (t) => { document.title = t; },
        args: [title],
      }).catch(() => clearInterval(flashInterval));
    });
  }, 800);

  // Stop after 60 seconds
  setTimeout(() => {
    if (flashInterval) clearInterval(flashInterval);
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => { document.title = 'Amazon Jobs'; },
    }).catch(() => {});
  }, 60000);
}

// ─── REPEAT ALERTS ───
let repeatCount = 0;

function scheduleRepeatAlert(intervalSeconds, maxRepeats) {
  chrome.alarms.clear('repeat-alert');
  repeatCount = 0;
  chrome.alarms.create('repeat-alert', {
    periodInMinutes: intervalSeconds / 60,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'repeat-alert') {
    repeatCount++;
    const settings = await getSettings();
    if (repeatCount >= settings.maxRepeats) {
      chrome.alarms.clear('repeat-alert');
      return;
    }
    // Play sound again
    const tabs = await chrome.tabs.query({ url: 'https://www.jobsatamazon.co.uk/*' });
    if (tabs.length > 0 && settings.soundEnabled) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'PLAY_ALERT_SOUND',
          soundType: 'job',
          count: Math.min(settings.beepCount, 3),
          speed: settings.beepSpeed,
          volume: settings.volume / 100,
        });
      } catch (e) { /* ignore */ }
    }
  }
});

// ─── SOUND ───
async function playTestSound(soundType) {
  const tabs = await chrome.tabs.query({ url: 'https://www.jobsatamazon.co.uk/*' });
  if (tabs.length > 0) {
    try {
      await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'PLAY_ALERT_SOUND',
        soundType,
        count: 5,
        speed: 200,
        volume: 1.0,
      });
    } catch (e) { console.error(e); }
  }
}

// ─── NOTIFICATION ───
function showNotification(title, body, url) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message: body,
    priority: 2,
    requireInteraction: true,
  });
}

// ─── SETTINGS UPDATE ───
async function updateAndRestart(newSettings) {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged });

  const data = await chrome.storage.local.get(STORAGE_KEYS.STATUS);
  if (data[STORAGE_KEYS.STATUS] === 'monitoring') {
    await startJobsMonitoring(merged);
    await startShiftsMonitoring(merged);
  }
}

// ─── STATUS ───
async function getFullStatus() {
  const [settings, data] = await Promise.all([
    getSettings(),
    chrome.storage.local.get([
      STORAGE_KEYS.STATUS,
      STORAGE_KEYS.TOTAL_FOUND,
      STORAGE_KEYS.NEW_ITEMS_LOG,
    ]),
  ]);
  return {
    settings,
    status: data[STORAGE_KEYS.STATUS] || 'idle',
    totalFound: data[STORAGE_KEYS.TOTAL_FOUND] || 0,
    recentItems: (data[STORAGE_KEYS.NEW_ITEMS_LOG] || []).slice(0, 100),
  };
}

// ─── REMOVE ITEM ───
async function removeItemFromLog(itemId) {
  const data = await chrome.storage.local.get([STORAGE_KEYS.NEW_ITEMS_LOG, STORAGE_KEYS.TOTAL_FOUND]);
  let log = data[STORAGE_KEYS.NEW_ITEMS_LOG] || [];
  log = log.filter(i => i.id !== itemId);
  await chrome.storage.local.set({
    [STORAGE_KEYS.NEW_ITEMS_LOG]: log,
    [STORAGE_KEYS.TOTAL_FOUND]: Math.max(0, (data[STORAGE_KEYS.TOTAL_FOUND] || 1) - 1),
  });
  return { success: true, log };
}
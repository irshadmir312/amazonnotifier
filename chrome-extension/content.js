// Amazon Jobs & Shifts Monitor v2 — Content Script
(function () {
  'use strict';
  if (window.__amazonMonitorV2) return;
  window.__amazonMonitorV2 = true;

  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // ─── LOUD MULTI-BEEP SOUND ENGINE ───
  function playBeep(frequency, duration, volume) {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square'; // square wave = loudest, most piercing
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(Math.min(volume, 1.0), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  // JOB ALERT: Rapid high-pitched bip bip bip (urgent alarm style)
  function playJobAlert(count, speed, volume) {
    const ctx = getAudioCtx();
    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + i * (speed / 1000);
      // Bip 1 — high
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(1200, t);
      g1.gain.setValueAtTime(volume, t);
      g1.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc1.connect(g1); g1.connect(ctx.destination);
      osc1.start(t); osc1.stop(t + 0.1);

      // Bip 2 — higher
      const t2 = t + speed / 2000;
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1600, t2);
      g2.gain.setValueAtTime(volume, t2);
      g2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.08);
      osc2.connect(g2); g2.connect(ctx.destination);
      osc2.start(t2); osc2.stop(t2 + 0.1);
    }
  }

  // SHIFT ALERT: Deep double-beep (different from jobs)
  function playShiftAlert(count, speed, volume) {
    const ctx = getAudioCtx();
    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + i * (speed / 1000);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.18);

      const t2 = t + speed / 1500;
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1000, t2);
      g2.gain.setValueAtTime(volume, t2);
      g2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.15);
      osc2.connect(g2); g2.connect(ctx.destination);
      osc2.start(t2); osc2.stop(t2 + 0.18);
    }
  }

  // ─── PAGE TYPE DETECTION ───
  function getPageType() {
    const url = window.location.href;
    if (url.includes('/selfservice/schedule/')) return 'shifts';
    return 'jobs';
  }

  // ─── SCRAPE: JOBS PAGE ───
  function scrapeJobs() {
    const jobs = [];
    const seen = new Set();
    const url = window.location.href;

    // Strategy 1: Job-specific selectors
    const selectors = [
      'a[data-job-id]',
      '[class*="job-card"] a',
      '[class*="jobCard"] a',
      '[class*="job-listing"] a',
      '[class*="search-result"] a',
      '[class*="job-item"] a',
      'a[href*="/job/"]',
      'a[href*="jobId"]',
      'a[href*="requisition"]',
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          const href = el.getAttribute('href') || '';
          const jobUrl = href.startsWith('http') ? href : `https://www.jobsatamazon.co.uk${href}`;
          const id = href || text.toLowerCase().replace(/\s+/g, '-').substring(0, 120);

          if (text.length > 5 && !seen.has(id)) {
            seen.add(id);
            const container = el.closest('[class*="job"], [class*="card"], [class*="result"], [class*="listing"], li, tr');
            let location = '', date = '', description = '';

            if (container) {
              const loc = container.querySelector('[class*="location"], [class*="city"], [class*="address"]');
              if (loc) location = loc.textContent?.trim() || '';
              const dt = container.querySelector('[class*="date"], [class*="posted"], [class*="time"]');
              if (dt) date = dt.textContent?.trim() || '';
              description = container.textContent?.trim().substring(0, 300) || '';
            }

            jobs.push({ id, title: text.substring(0, 200), url: jobUrl, location: location || 'UK', date: date || new Date().toLocaleDateString(), company: 'Amazon', description });
          }
        });
        if (jobs.length > 0) break;
      } catch (e) { /* continue */ }
    }

    // Strategy 2: Heuristic link matching
    if (jobs.length === 0) {
      document.querySelectorAll('a').forEach((el) => {
        const text = el.textContent?.trim() || '';
        const href = el.getAttribute('href') || '';
        const skip = ['sign in','login','register','home','about','contact','search','filter','privacy','terms','help','cookie','language','accessibility'];
        const isJob = text.length > 10 && text.length < 200 &&
          !skip.some(w => text.toLowerCase().includes(w)) &&
          (href.includes('job') || href.includes('requisition') ||
            text.match(/\b(engineer|developer|manager|analyst|specialist|associate|director|lead|coordinator|intern|consultant|architect|scientist|administrator|officer|executive|technician|warehouse|fulfillment|delivery|driver|picker|packer|sorter)\b/i));
        if (isJob) {
          const id = href || text.toLowerCase().replace(/\s+/g, '-').substring(0, 120);
          if (!seen.has(id)) {
            seen.add(id);
            jobs.push({ id, title: text.substring(0, 200), url: href.startsWith('http') ? href : `https://www.jobsatamazon.co.uk${href}`, location: 'UK', date: new Date().toLocaleDateString(), company: 'Amazon' });
          }
        }
      });
    }

    // Strategy 3: JSON in script tags
    if (jobs.length === 0) {
      document.querySelectorAll('script').forEach((script) => {
        const text = script.textContent || '';
        const matches = text.match(/"jobTitle"\s*:\s*"([^"]+)"/g) || [];
        matches.forEach((match) => {
          const m = match.match(/"jobTitle"\s*:\s*"([^"]+)"/);
          if (m) {
            const id = `json-${m[1].toLowerCase().replace(/\s+/g, '-')}`;
            if (!seen.has(id)) {
              seen.add(id);
              jobs.push({ id, title: m[1], url: window.location.href, location: 'UK', date: new Date().toLocaleDateString(), company: 'Amazon' });
            }
          }
        });
      });
    }

    return jobs;
  }

  // ─── SCRAPE: SHIFTS PAGE ───
  function scrapeShifts() {
    const shifts = [];
    const seen = new Set();

    // Look for shift cards, schedule entries, time slots
    const shiftSelectors = [
      '[class*="shift"]',
      '[class*="schedule"]',
      '[class*="time-slot"]',
      '[class*="shiftCard"]',
      '[class*="assignment"]',
      '[class*="roster"]',
      'table tr',
      '[class*="card"]',
    ];

    for (const selector of shiftSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          // Shift indicators
          if (text.length < 5) return;
          const isShift = /\b(shift|schedule|roster|assignment|start|end|break|overtime|pick[ -]?up|drop[ -]?off|morning|afternoon|night|day shift|night shift|early|late|flexible|stagger)\b/i.test(text) &&
            /\b(\d{1,2}[:]\d{2}|AM|PM|\d{1,2}[:]\d{2}\s*(?:AM|PM)?)/i.test(text);

          if (isShift || text.match(/\d{1,2}[:]\d{2}/)) {
            const id = `shift-${text.substring(0, 100).replace(/[\s\n]+/g, '-').toLowerCase()}`;
            if (!seen.has(id) && text.length > 10) {
              seen.add(id);
              shifts.push({
                id,
                title: text.substring(0, 200).replace(/\n+/g, ' | '),
                url: window.location.href,
                location: 'UK',
                date: new Date().toLocaleDateString(),
                company: 'Amazon',
                description: text.substring(0, 500),
              });
            }
          }
        });
        if (shifts.length > 0) break;
      } catch (e) { /* continue */ }
    }

    // Broader: find any table rows or cards with times
    if (shifts.length === 0) {
      document.querySelectorAll('tr, [class*="card"], [class*="item"], [class*="row"], li').forEach((el) => {
        const text = el.textContent?.trim() || '';
        if (text.length > 10 && text.length < 500 && /\d{1,2}[:]\d{2}/.test(text)) {
          const id = `shift-${text.substring(0, 80).replace(/[\s\n]+/g, '-').toLowerCase()}`;
          if (!seen.has(id)) {
            seen.add(id);
            shifts.push({
              id,
              title: text.substring(0, 200).replace(/\n+/g, ' | '),
              url: window.location.href,
              location: 'UK',
              date: new Date().toLocaleDateString(),
              company: 'Amazon',
            });
          }
        }
      });
    }

    return shifts;
  }

  // ─── PAGE OVERLAY ───
  function createOverlay() {
    if (document.getElementById('amazon-monitor-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'amazon-monitor-overlay';
    overlay.className = 'amm-overlay';
    overlay.innerHTML = `
      <div class="amm-overlay-bar">
        <div class="amm-pulse-dot amm-pulse"></div>
        <span class="amm-status-text">Monitoring Active</span>
        <span class="amm-item-count" id="amm-item-count">0 new</span>
        <button class="amm-dismiss-btn" id="amm-dismiss-btn" title="Dismiss">✕</button>
      </div>
      <div class="amm-alert-panel" id="amm-alert-panel" style="display:none;">
        <div class="amm-alert-header">
          <span class="amm-alert-icon">🔔</span>
          <span>New items detected!</span>
        </div>
        <div class="amm-alert-list" id="amm-alert-list"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('amm-dismiss-btn').addEventListener('click', () => {
      const panel = document.getElementById('amm-alert-panel');
      if (panel) panel.style.display = 'none';
      chrome.runtime.sendMessage({ type: 'DISMISS_ALERTS' });
    });
  }

  function updateOverlay(newCount, pageType, items) {
    createOverlay();
    const countEl = document.getElementById('amm-item-count');
    const panel = document.getElementById('amm-alert-panel');
    const list = document.getElementById('amm-alert-list');
    if (!countEl || !panel || !list) return;

    countEl.textContent = `${newCount} new`;
    countEl.className = `amm-item-count amm-flash ${pageType === 'shifts' ? 'amm-shift' : 'amm-job'}`;

    if (items && items.length > 0) {
      panel.style.display = 'block';
      list.innerHTML = items.map(item => `
        <div class="amm-alert-item ${pageType === 'shifts' ? 'amm-shift' : 'amm-job'}">
          <div class="amm-alert-badge">${pageType === 'shifts' ? 'SHIFT' : 'JOB'}</div>
          <div class="amm-alert-title">${item.title}</div>
          ${item.location ? `<div class="amm-alert-meta">${item.location}</div>` : ''}
        </div>
      `).join('');

      // Auto-hide after 30s
      setTimeout(() => { panel.style.display = 'none'; }, 30000);
    }
  }

  // ─── MESSAGE HANDLER ───
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCRAPE_JOBS') {
      const pageType = message.pageType || getPageType();
      const items = pageType === 'shifts' ? scrapeShifts() : scrapeJobs();
      sendResponse({ items });
    }
    if (message.type === 'PLAY_ALERT_SOUND') {
      const { soundType, count = 5, speed = 200, volume = 1.0 } = message;
      if (soundType === 'shift') {
        playShiftAlert(count, speed, volume);
      } else {
        playJobAlert(count, speed, volume);
      }
      sendResponse({ played: true });
    }
    if (message.type === 'UPDATE_OVERLAY') {
      updateOverlay(message.newCount, message.pageType, message.items);
      sendResponse({ updated: true });
    }
    return true;
  });

  // ─── AUTO-SCRAPE ON PAGE LOAD ───
  function autoScrape() {
    const pageType = getPageType();
    const items = pageType === 'shifts' ? scrapeShifts() : scrapeJobs();
    if (items.length > 0) {
      try {
        chrome.runtime.sendMessage({ type: 'ITEMS_FOUND', items, pageType });
      } catch (e) { /* extension context invalidated */ }
    }
  }

  // Wait for SPA render
  function init() {
    createOverlay();
    if (document.readyState === 'complete') {
      setTimeout(autoScrape, 2000);
    } else {
      window.addEventListener('load', () => setTimeout(autoScrape, 2000));
    }

    // MutationObserver for SPA
    let debounce;
    const observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(autoScrape, 3000);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
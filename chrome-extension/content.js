// Amazon Jobs Monitor - Content Script
// Runs on https://www.jobsatamazon.co.uk/*

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__amazonJobsMonitorInjected) return;
  window.__amazonJobsMonitorInjected = true;

  console.log('[Amazon Jobs Monitor] Content script loaded.');

  // Audio context for notification sound
  let audioContext = null;
  let soundUrl = null;

  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  // Generate notification chime programmatically (no external file needed)
  function playNotificationChime() {
    try {
      const ctx = getAudioContext();
      // Play a pleasant two-tone chime
      const now = ctx.currentTime;

      // First tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Second tone (higher, slightly delayed)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.15); // E6
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.6);

      // Third tone (highest)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1760, now + 0.3); // A6
      gain3.gain.setValueAtTime(0.3, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.9);
    } catch (e) {
      console.error('[Amazon Jobs Monitor] Sound playback error:', e);
    }
  }

  // Scrape job listings from the page
  // The Amazon jobs page uses various DOM structures. We try multiple selectors.
  function scrapeJobs() {
    const jobs = [];

    // Strategy 1: Look for job cards/links in common patterns
    const selectors = [
      // Common job listing patterns on Amazon jobs site
      'a[data-job-id]',
      '[class*="job-card"] a',
      '[class*="jobCard"] a',
      '[class*="job-listing"] a',
      '[class*="search-result"] a',
      '[class*="job-item"] a',
      // Generic link patterns that might match job posts
      'a[href*="/job/"]',
      'a[href*="jobId"]',
      'a[href*="requisition"]',
    ];

    const seen = new Set();

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          const href = el.getAttribute('href') || '';
          const jobUrl = href.startsWith('http') ? href : `https://www.jobsatamazon.co.uk${href}`;

          // Generate a unique ID from URL or text
          const id = href || text.toLowerCase().replace(/\s+/g, '-').substring(0, 100);

          if (text.length > 5 && !seen.has(id)) {
            seen.add(id);

            // Try to get more context from parent elements
            const container = el.closest('[class*="job"], [class*="card"], [class*="result"], [class*="listing"], li, tr');
            let location = '';
            let date = '';
            let company = 'Amazon';

            if (container) {
              const locEl = container.querySelector('[class*="location"], [class*="city"], [class*="address"]');
              if (locEl) location = locEl.textContent?.trim() || '';

              const dateEl = container.querySelector('[class*="date"], [class*="posted"], [class*="time"]');
              if (dateEl) date = dateEl.textContent?.trim() || '';
            }

            jobs.push({
              id,
              title: text.substring(0, 200),
              url: jobUrl,
              location: location || 'UK',
              date: date || new Date().toLocaleDateString(),
              company,
            });
          }
        });

        if (jobs.length > 0) break; // Found jobs with this selector, stop trying
      } catch (e) {
        // Selector might be invalid, continue to next
      }
    }

    // Strategy 2: If no jobs found with specific selectors, try broader approach
    if (jobs.length === 0) {
      // Look for all links that seem to be job-related
      const allLinks = document.querySelectorAll('a');
      allLinks.forEach((el) => {
        const text = el.textContent?.trim() || '';
        const href = el.getAttribute('href') || '';

        // Heuristic: job titles usually don't contain these words
        const skipWords = ['sign in', 'login', 'register', 'home', 'about', 'contact', 'search', 'filter', 'privacy', 'terms', 'help', 'cookie', 'language', 'accessibility'];
        const isJobLike = text.length > 10 && text.length < 200 &&
          !skipWords.some(w => text.toLowerCase().includes(w)) &&
          (href.includes('job') || href.includes('requisition') || href.includes('position') || text.match(/\b(engineer|developer|manager|analyst|specialist|associate|director|lead|coordinator|intern|consultant|architect|scientist|administrator|officer|executive|technician)\b/i));

        if (isJobLike) {
          const id = href || text.toLowerCase().replace(/\s+/g, '-').substring(0, 100);
          if (!seen.has(id)) {
            seen.add(id);
            const jobUrl = href.startsWith('http') ? href : `https://www.jobsatamazon.co.uk${href}`;
            jobs.push({
              id,
              title: text.substring(0, 200),
              url: jobUrl,
              location: 'UK',
              date: new Date().toLocaleDateString(),
              company: 'Amazon',
            });
          }
        }
      });
    }

    // Strategy 3: Try to read from any JSON data embedded in the page
    if (jobs.length === 0) {
      try {
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script) => {
          const text = script.textContent || '';
          // Look for JSON data containing job info
          const jobMatches = text.match(/"jobTitle"\s*:\s*"([^"]+)"/g) || [];
          jobMatches.forEach((match) => {
            const titleMatch = match.match(/"jobTitle"\s*:\s*"([^"]+)"/);
            if (titleMatch) {
              const id = `json-${titleMatch[1].toLowerCase().replace(/\s+/g, '-')}`;
              if (!seen.has(id)) {
                seen.add(id);
                jobs.push({
                  id,
                  title: titleMatch[1],
                  url: window.location.href,
                  location: 'UK',
                  date: new Date().toLocaleDateString(),
                  company: 'Amazon',
                });
              }
            }
          });
        });
      } catch (e) {
        // Ignore parsing errors
      }
    }

    console.log(`[Amazon Jobs Monitor] Scraped ${jobs.length} job(s) from page.`);
    return jobs;
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCRAPE_JOBS') {
      const jobs = scrapeJobs();
      sendResponse({ jobs });
    }
    if (message.type === 'PLAY_SOUND') {
      playNotificationChime();
      sendResponse({ played: true });
    }
    return true;
  });

  // Auto-scrape and send to background after page loads (for SPA)
  function autoScrape() {
    const jobs = scrapeJobs();
    if (jobs.length > 0) {
      try {
        chrome.runtime.sendMessage({ type: 'JOBS_SCRAPE_RESULT', jobs });
      } catch (e) {
        // Extension context might be invalidated during page reload
      }
    }
  }

  // Wait for the SPA to fully render
  if (document.readyState === 'complete') {
    setTimeout(autoScrape, 2000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(autoScrape, 2000);
    });
  }

  // Also observe DOM changes (for SPA navigation)
  const observer = new MutationObserver(() => {
    // Debounce
    clearTimeout(window.__amazonJobsDebounce);
    window.__amazonJobsDebounce = setTimeout(autoScrape, 3000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
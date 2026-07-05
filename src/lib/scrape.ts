import * as cheerio from 'cheerio'

export interface ScrapedJob {
  externalId: string
  title: string
  location: string
  department: string
  url: string
  description: string
  rawText: string
}

const AMAZON_JOBS_URL = 'https://www.jobsatamazon.co.uk/app#/jobSearch'

// Try multiple strategies to fetch Amazon jobs
export async function scrapeAmazonJobs(): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = []

  try {
    // Strategy 0: Use z-ai-web-dev-sdk page_reader (renders SPAs)
    const sdkJobs = await trySDKPageReader()
    if (sdkJobs.length > 0) return sdkJobs
  } catch (e) {
    console.log('[Scraper] SDK strategy failed:', (e as Error).message)
  }

  try {
    // Strategy 1: Try the known Amazon jobs API endpoints
    const apiJobs = await tryApiEndpoints()
    if (apiJobs.length > 0) return apiJobs
  } catch (e) {
    console.log('[Scraper] API strategy failed:', (e as Error).message)
  }

  try {
    // Strategy 2: Fetch the page HTML and extract embedded data
    const htmlJobs = await tryHtmlScraping()
    if (htmlJobs.length > 0) return htmlJobs
  } catch (e) {
    console.log('[Scraper] HTML strategy failed:', (e as Error).message)
  }

  try {
    // Strategy 3: Try alternative API patterns
    const altJobs = await tryAlternativeEndpoints()
    if (altJobs.length > 0) return altJobs
  } catch (e) {
    console.log('[Scraper] Alternative strategy failed:', (e as Error).message)
  }

  return jobs
}

// Strategy 0: z-ai-web-dev-sdk page reader (can render SPAs)
async function trySDKPageReader(): Promise<ScrapedJob[]> {
  try {
    // Dynamic import to avoid build issues on Vercel
    const ZAI = await import('z-ai-web-dev-sdk')
    const ZAIClass = ZAI.default || ZAI
    const zai = await ZAIClass.create()

    console.log('[Scraper] Using z-ai-web-dev-sdk page_reader...')

    const result = await zai.functions.invoke('page_reader', {
      url: AMAZON_JOBS_URL,
    })

    const html = result?.data?.html || ''
    const text = result?.data?.text || ''

    if (!html && !text) {
      console.log('[Scraper] SDK returned empty content')
      return []
    }

    console.log(`[Scraper] SDK returned ${html.length} chars HTML, ${text.length} chars text`)

    // Try to parse jobs from the rendered content
    if (html) {
      const $ = cheerio.load(html)
      const jobs = extractJobsFromHtml($)
      if (jobs.length > 0) return jobs
    }

    // Try to extract job-like patterns from text
    if (text) {
      const textJobs = extractJobsFromText(text)
      if (textJobs.length > 0) return textJobs
    }

    return []
  } catch (e) {
    console.log('[Scraper] SDK import/execution failed:', (e as Error).message)
    return []
  }
}

function extractJobsFromHtml($: cheerio.CheerioAPI): ScrapedJob[] {
  const jobs: ScrapedJob[] = []

  // Look for embedded JSON in script tags (from rendered SPA)
  const scripts = $('script').toArray()
  for (const script of scripts) {
    const content = $(script).html() || ''
    const patterns = [
      /window\.__INITIAL_STATE__\s*=\s*({.+?});/s,
      /window\.__APP_DATA__\s*=\s*({.+?});/s,
      /window\.JOBS_DATA\s*=\s*({.+?});/s,
      /window\.__NEXT_DATA__\s*=\s*({.+?})\s*<\/script>/s,
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match) {
        try {
          const data = JSON.parse(match[1])
          const extracted = extractJobsFromEmbeddedData(data)
          if (extracted.length > 0) return extracted
        } catch {
          // Not valid JSON
        }
      }
    }
  }

  // Try job card selectors (after SPA render)
  const selectors = [
    '[data-job-id]',
    '.job-card',
    '.job-tile',
    '.search-result',
    '.job-listing',
    'article.job',
    '[class*="jobCard"]',
    '[class*="job-card"]',
    '[class*="JobCard"]',
    'a[href*="/jobs/"]',
    'a[href*="jobSearch"]',
  ]

  for (const selector of selectors) {
    const cards = $(selector).toArray()
    if (cards.length === 0) continue

    for (const card of cards) {
      const $card = $(card)
      const title = $card.find('[class*="title"], h2, h3, h4, [class*="name"]').first().text().trim()
      const location = $card.find('[class*="location"], [class*="city"], [class*="area"]').first().text().trim()
      const dept = $card.find('[class*="department"], [class*="category"], [class*="business"]').first().text().trim()
      const link = $card.closest('a').attr('href') || $card.find('a').first().attr('href') || ''
      const desc = $card.find('[class*="desc"], [class*="summary"], p').first().text().trim()

      if (title && title.length > 5) {
        jobs.push({
          externalId: `sdk-${Buffer.from(title).toString('base64url').slice(0, 20)}`,
          title,
          location: location || 'United Kingdom',
          department: dept || '',
          url: link.startsWith('http') ? link : `https://www.jobsatamazon.co.uk${link}`,
          description: desc.slice(0, 500),
          rawText: `${title} ${location} ${dept} ${desc}`.trim().slice(0, 1000),
        })
      }
    }

    if (jobs.length > 0) break
  }

  return jobs
}

function extractJobsFromText(text: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = []

  // Look for job title patterns in plain text
  // Common Amazon warehouse job titles
  const jobPatterns = [
    /(?:Warehouse|Fulfillment|Sortation|Delivery|Pick|Pack|Logistics|Operations)\s+(?:Associate|Operative|Worker|Team Member|Colleague)/gi,
    /(?:Amazon|Hourly)\s+(?:Warehouse|Fulfillment|Sortation|Delivery)\s+(?:Associate|Operative)/gi,
  ]

  const seen = new Set<string>()

  for (const pattern of jobPatterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const title = match[0].trim()
      if (!seen.has(title) && title.length > 10) {
        seen.add(title)

        // Try to find location nearby
        const pos = match.index || 0
        const nearbyText = text.slice(Math.max(0, pos - 100), pos + 200)
        const locationMatch = nearbyText.match(/(?:in|at|Location:)\s*([A-Za-z\s,]+?)(?:\.|,|\n|$)/)

        jobs.push({
          externalId: `text-${Buffer.from(title).toString('base64url').slice(0, 20)}`,
          title,
          location: locationMatch?.[1]?.trim() || 'United Kingdom',
          department: 'Warehouse / Fulfillment',
          url: AMAZON_JOBS_URL,
          description: '',
          rawText: title,
        })
      }
    }
  }

  return jobs.slice(0, 20)
}

async function tryApiEndpoints(): Promise<ScrapedJob[]> {
  const endpoints = [
    {
      url: 'https://www.amazon.jobs/api/jobs/search?country=United%20Kingdom&offset=0&limit=50',
      parser: parseAmazonJobsApi,
    },
    {
      url: 'https://www.amazon.jobs/en-gb/search?base_query=&country=United%20Kingdom&job_type=hourly&offset=0&result_limit=50',
      parser: parseAmazonSearchApi,
    },
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) continue

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await response.json()
        return endpoint.parser(data)
      }
    } catch (e) {
      console.log(`[Scraper] Endpoint ${endpoint.url} failed:`, (e as Error).message)
    }
  }

  return []
}

async function tryAlternativeEndpoints(): Promise<ScrapedJob[]> {
  const endpoints = [
    'https://www.jobsatamazon.co.uk/api/search?keyword=&location=&radius=0',
    'https://www.jobsatamazon.co.uk/api/jobs?page=1&size=50',
  ]

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': AMAZON_JOBS_URL,
          'Origin': 'https://www.jobsatamazon.co.uk',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        if (data && (data.jobs || data.results || data.data)) {
          return parseGenericJobApi(data)
        }
      }
    } catch (e) {
      console.log(`[Scraper] Alt endpoint ${url} failed:`, (e as Error).message)
    }
  }

  return []
}

async function tryHtmlScraping(): Promise<ScrapedJob[]> {
  const response = await fetch(AMAZON_JOBS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) return []

  const html = await response.text()
  const $ = cheerio.load(html)

  const jobs: ScrapedJob[] = []

  const scripts = $('script').toArray()
  for (const script of scripts) {
    const content = $(script).html() || ''
    const dataMatch = content.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s)
      || content.match(/window\.__APP_DATA__\s*=\s*({.+?});/s)
      || content.match(/window\.JOBS_DATA\s*=\s*({.+?});/s)

    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1])
        const extracted = extractJobsFromEmbeddedData(data)
        if (extracted.length > 0) return extracted
      } catch {
        // Not valid JSON, continue
      }
    }
  }

  const jobCards = $('[data-job-id], .job-card, .job-tile, .search-result, .job-listing, article.job').toArray()
  for (const card of jobCards) {
    const $card = $(card)
    const title = $card.find('[class*="title"], h2, h3, h4').first().text().trim()
    const location = $card.find('[class*="location"], [class*="city"]').first().text().trim()
    const dept = $card.find('[class*="department"], [class*="category"]').first().text().trim()
    const link = $card.find('a[href*="job"]').first().attr('href') || ''
    const desc = $card.find('[class*="desc"], p, [class*="summary"]').first().text().trim()

    if (title) {
      jobs.push({
        externalId: `html-${Buffer.from(title).toString('base64url').slice(0, 20)}`,
        title,
        location: location || 'United Kingdom',
        department: dept || '',
        url: link.startsWith('http') ? link : `https://www.jobsatamazon.co.uk${link}`,
        description: desc,
        rawText: `${title} ${location} ${dept} ${desc}`.trim(),
      })
    }
  }

  return jobs
}

function parseAmazonJobsApi(data: Record<string, unknown>): ScrapedJob[] {
  const jobs: ScrapedJob[] = []
  const jobList = (data.jobs || data.results || data.data || []) as Record<string, unknown>[]

  for (const job of jobList) {
    const id = String(job.id_icims || job.job_id || job.id || '')
    const title = String(job.title || job.job_title || job.position_title || '')
    const location = String(job.location || job.city || job.job_location || '')
    const dept = String(job.department || job.job_category || job.business_category || '')
    const url = String(job.url || job.apply_url || job.job_path || '')
    const desc = String(job.description || job.job_description || job.short_description || '')

    if (title && id) {
      jobs.push({
        externalId: `amazon-${id}`,
        title,
        location: location || 'United Kingdom',
        department: dept,
        url: url || `https://www.amazon.jobs/en-gb/jobs/${id}`,
        description: desc.slice(0, 500),
        rawText: `${title} ${location} ${dept} ${desc}`.trim().slice(0, 1000),
      })
    }
  }

  return jobs
}

function parseAmazonSearchApi(data: Record<string, unknown>): ScrapedJob[] {
  return parseAmazonJobsApi(data)
}

function parseGenericJobApi(data: Record<string, unknown>): ScrapedJob[] {
  const jobs: ScrapedJob[] = []
  const jobList = (data.jobs || data.results || data.data || data.items || []) as Record<string, unknown>[]

  for (const job of jobList) {
    const id = String(job.id || job.jobId || job.externalId || '')
    const title = String(job.title || job.name || job.position || '')
    const location = String(job.location || job.city || '')
    const dept = String(job.department || job.category || '')
    const url = String(job.url || job.link || job.applyUrl || '')
    const desc = String(job.description || job.summary || '')

    if (title && id) {
      jobs.push({
        externalId: `generic-${id}`,
        title,
        location: location || 'United Kingdom',
        department: dept,
        url: url || AMAZON_JOBS_URL,
        description: desc.slice(0, 500),
        rawText: `${title} ${location} ${dept} ${desc}`.trim().slice(0, 1000),
      })
    }
  }

  return jobs
}

function extractJobsFromEmbeddedData(data: Record<string, unknown>): ScrapedJob[] {
  function findJobArrays(obj: unknown, depth = 0): ScrapedJob[] {
    if (depth > 5 || !obj || typeof obj !== 'object') return []

    const results: ScrapedJob[] = []
    const record = obj as Record<string, unknown>

    for (const [, value] of Object.entries(record)) {
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0]
        if (firstItem && typeof firstItem === 'object') {
          const item = firstItem as Record<string, unknown>
          if ((item.title || item.name || item.position) && (item.id || item.jobId)) {
            results.push(...parseGenericJobApi({ jobs: value }))
            continue
          }
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        results.push(...findJobArrays(value, depth + 1))
      }
    }

    return results
  }

  return findJobArrays(data)
}
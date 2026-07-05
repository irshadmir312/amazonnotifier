import OpenAI from 'openai'

interface JobToAnalyze {
  externalId: string
  title: string
  location: string
  department: string
  description: string
  rawText: string
}

export interface AIAnalysisResult {
  externalId: string
  isRelevant: boolean
  isHourly: boolean
  noCvRequired: boolean
  jobType: string
  reasoning: string
  confidence: number // 0-1
}

function getAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || ''
  const baseURL = process.env.OPENAI_BASE_URL || undefined

  if (!apiKey || apiKey === 'placeholder') {
    throw new Error('OPENAI_API_KEY is not set')
  }

  return new OpenAI({
    apiKey,
    baseURL,
  })
}

// Use z-ai-web-dev-sdk as fallback when OpenAI key is not configured
async function analyzeWithSDK(jobs: JobToAnalyze[]): Promise<AIAnalysisResult[]> {
  try {
    const ZAI = await import('z-ai-web-dev-sdk')
    const ZAIClass = ZAI.default || ZAI
    const zai = await ZAIClass.create()

    const jobDescriptions = jobs.map((job, i) => ({
      index: i,
      title: job.title,
      location: job.location,
      department: job.department,
      description: job.description || 'No description available',
    }))

    const systemPrompt = `You are an expert job analyst for Amazon UK jobs. Analyze job listings and determine if they match: 1) HOURLY position (data warehouse/fulfillment), 2) Does NOT require a CV/resume, 3) Located in the UK.

Respond ONLY with a JSON object containing a "results" array. Each result has: "index" (number), "isRelevant" (boolean), "isHourly" (boolean), "noCvRequired" (boolean), "jobType" (string: "hourly"|"salaried"|"contract"|"unknown"), "reasoning" (string, 1-2 sentences), "confidence" (number 0-1).

Amazon warehouse/fulfillment hourly roles (Warehouse Operative, Fulfillment Associate, Pick & Pack, Sortation Associate) almost NEVER require a CV.`

    const userPrompt = `Analyze these ${jobs.length} Amazon UK job listings:\n\n${JSON.stringify(jobDescriptions, null, 2)}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const content = completion.choices[0]?.message?.content || '[]'
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const results = parsed.results || parsed.jobs || parsed.data || parsed

    if (Array.isArray(results)) {
      return results.map((r: Record<string, unknown>) => ({
        externalId: jobs[(r.index as number) || 0]?.externalId || 'unknown',
        isRelevant: Boolean(r.isRelevant),
        isHourly: Boolean(r.isHourly),
        noCvRequired: Boolean(r.noCvRequired),
        jobType: String(r.jobType || 'unknown'),
        reasoning: String(r.reasoning || ''),
        confidence: Number(r.confidence || 0.5),
      }))
    }

    return []
  } catch (e) {
    console.error('[AI Filter] SDK fallback failed:', e)
    return keywordFallback(jobs)
  }
}

export async function analyzeJobs(
  jobs: JobToAnalyze[],
): Promise<AIAnalysisResult[]> {
  if (jobs.length === 0) return []

  // Check if OpenAI is properly configured (not a placeholder)
  const apiKey = process.env.OPENAI_API_KEY || ''
  const useSDK = !apiKey || apiKey === 'placeholder'

  if (useSDK) {
    console.log('[AI Filter] OpenAI not configured, using z-ai-web-dev-sdk')
    return analyzeWithSDK(jobs)
  }

  const client = getAIClient()

  const jobDescriptions = jobs.map((job, i) => ({
    index: i,
    title: job.title,
    location: job.location,
    department: job.department,
    description: job.description || 'No description available',
  }))

  const systemPrompt = `You are an expert job analyst for Amazon UK jobs. Analyze job listings and determine if they match: 1) HOURLY position (data warehouse/fulfillment), 2) Does NOT require a CV/resume, 3) Located in the UK.

For each job, respond with a JSON array of objects with these fields:
- "index": the job index number
- "isRelevant": true if the job matches ALL criteria above (hourly + no CV + UK data warehouse)
- "isHourly": true if this appears to be an hourly paid position
- "noCvRequired": true if this position does not require submitting a CV/resume (look for keywords like "instant apply", "no CV", "quick apply", "apply now", or if it's a warehouse/fulfillment hourly role which typically don't need CVs)
- "jobType": one of "hourly", "salaried", "contract", "unknown"
- "reasoning": brief explanation (1-2 sentences)
- "confidence": 0.0 to 1.0

IMPORTANT: Amazon warehouse/fulfillment center hourly roles (like "Warehouse Operative", "Fulfillment Associate", "Pick & Pack", "Sortation Associate") almost NEVER require a CV. They use instant apply. Consider these as noCvRequired=true.

Respond ONLY with the JSON array, no markdown, no explanation outside the array.`

  const userPrompt = `Analyze these ${jobs.length} Amazon UK job listings:\n\n${JSON.stringify(jobDescriptions, null, 2)}`

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '[]'
    const parsed = JSON.parse(content)
    const results = parsed.results || parsed.jobs || parsed.data || parsed

    if (Array.isArray(results)) {
      return results.map((r: Record<string, unknown>) => ({
        externalId: jobs[(r.index as number) || 0]?.externalId || 'unknown',
        isRelevant: Boolean(r.isRelevant),
        isHourly: Boolean(r.isHourly),
        noCvRequired: Boolean(r.noCvRequired),
        jobType: String(r.jobType || 'unknown'),
        reasoning: String(r.reasoning || ''),
        confidence: Number(r.confidence || 0.5),
      }))
    }

    return []
  } catch (error) {
    console.error('[AI Filter] Error:', error)
    // Fallback: simple keyword-based filtering
    return keywordFallback(jobs)
  }
}

function keywordFallback(jobs: JobToAnalyze[]): AIAnalysisResult[] {
  const hourlyKeywords = ['hourly', 'warehouse', 'fulfillment', 'operative', 'associate', 'picker', 'packer', 'sortation', 'delivery', 'logistics']
  const noCvKeywords = ['instant apply', 'quick apply', 'no cv', 'no resume', 'apply now', 'warehouse', 'fulfillment', 'operative']
  const targetKeywords = ['data warehouse', 'warehouse', 'fulfillment', 'distribution', 'sortation', 'logistics']

  return jobs.map((job) => {
    const text = `${job.title} ${job.department} ${job.description}`.toLowerCase()
    const isHourly = hourlyKeywords.some((k) => text.includes(k))
    const noCvRequired = noCvKeywords.some((k) => text.includes(k))
    const matchesTarget = targetKeywords.some((k) => text.includes(k))

    return {
      externalId: job.externalId,
      isRelevant: isHourly && noCvRequired && matchesTarget,
      isHourly,
      noCvRequired,
      jobType: isHourly ? 'hourly' : 'unknown',
      reasoning: 'Keyword-based fallback analysis',
      confidence: 0.6,
    }
  })
}

export async function generateJobDigest(jobs: AIAnalysisResult[], jobDetails: Map<string, JobToAnalyze>): Promise<string> {
  const relevantJobs = jobs.filter((j) => j.isRelevant)

  if (relevantJobs.length === 0) return ''

  const apiKey = process.env.OPENAI_API_KEY || ''
  const useSDK = !apiKey || apiKey === 'placeholder'

  const jobList = relevantJobs.map((j) => {
    const detail = jobDetails.get(j.externalId)
    return {
      title: detail?.title || j.externalId,
      location: detail?.location || '',
      department: detail?.department || '',
      reasoning: j.reasoning,
    }
  })

  const prompt = `Create a brief, exciting email notification about ${relevantJobs.length} new Amazon UK hourly job(s) found. Make it urgent and action-oriented. Include a brief summary of each job. Format as HTML with inline styles, using orange (#FF9900) as accent color. Keep it concise - under 200 words total.`

  try {
    if (useSDK) {
      const ZAI = await import('z-ai-web-dev-sdk')
      const ZAIClass = ZAI.default || ZAI
      const zai = await ZAIClass.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'You are a helpful notification assistant. Create concise, exciting email content.' },
          { role: 'user', content: `${prompt}\n\nJobs:\n${JSON.stringify(jobList, null, 2)}` },
        ],
        thinking: { type: 'disabled' },
      })
      return completion.choices[0]?.message?.content || ''
    }

    const client = getAIClient()
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful notification assistant. Create concise, exciting email content.' },
        { role: 'user', content: `${prompt}\n\nJobs:\n${JSON.stringify(jobList, null, 2)}` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('[AI Digest] Error:', error)
    return generateSimpleDigest(relevantJobs, jobDetails)
  }
}

function generateSimpleDigest(jobs: AIAnalysisResult[], jobDetails: Map<string, JobToAnalyze>): string {
  const items = jobs.map((j) => {
    const detail = jobDetails.get(j.externalId)
    return `<li><strong>${detail?.title || 'Unknown'}</strong> — ${detail?.location || 'UK'}<br/><small>${j.reasoning}</small></li>`
  }).join('')

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #FF9900;">🚨 New Amazon UK Jobs Detected!</h2>
      <p>We found <strong>${jobs.length}</strong> matching hourly position(s) that don't require a CV:</p>
      <ul style="line-height: 1.8;">${items}</ul>
      <p style="margin-top: 20px;">
        <a href="https://www.jobsatamazon.co.uk/app#/jobSearch" 
           style="background: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          View All Jobs →
        </a>
      </p>
    </div>
  `
}
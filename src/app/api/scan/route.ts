import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { scrapeAmazonJobs } from '@/lib/scrape'
import { analyzeJobs, generateJobDigest, type AIAnalysisResult } from '@/lib/ai-filter'
import { sendNewJobsAlert } from '@/lib/email'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check if AI is configured
    const aiConfigured = Boolean(process.env.OPENAI_API_KEY)
    const emailConfigured = Boolean(process.env.RESEND_API_KEY)

    // 1. Scrape jobs
    console.log('[Scan] Starting job scrape...')
    const scrapedJobs = await scrapeAmazonJobs()
    console.log(`[Scan] Found ${scrapedJobs.length} jobs from scraping`)

    // 2. Filter out already-known jobs
    const knownIds = new Set(
      (
        await db.detectedJob.findMany({
          select: { externalId: true },
        })
      ).map((j) => j.externalId),
    )

    const newJobs = scrapedJobs.filter((j) => !knownIds.has(j.externalId))
    console.log(`[Scan] ${newJobs.length} new jobs found`)

    if (newJobs.length === 0) {
      // Log successful scan with no new jobs
      await db.scanLog.create({
        data: {
          status: 'success',
          totalJobs: scrapedJobs.length,
          newJobs: 0,
          relevantJobs: 0,
          durationMs: Date.now() - startTime,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Scan complete. No new jobs found.',
        stats: {
          totalScraped: scrapedJobs.length,
          newJobs: 0,
          relevantJobs: 0,
          durationMs: Date.now() - startTime,
        },
      })
    }

    // 3. AI Analysis (if configured)
    let relevantJobs: AIAnalysisResult[] = []
    let jobDetailMap = new Map<string, (typeof newJobs)[0]>()
    let digestHtml = ''

    if (aiConfigured) {
      console.log('[Scan] Running AI analysis on', newJobs.length, 'jobs...')
      relevantJobs = await analyzeJobs(newJobs)

      const relevantFiltered = relevantJobs.filter((j) => j.isRelevant)
      console.log(`[Scan] AI found ${relevantFiltered.length} relevant jobs`)

      // Build detail map for notification
      for (const job of newJobs) {
        jobDetailMap.set(job.externalId, job)
      }

      // Generate AI digest for email
      if (relevantFiltered.length > 0) {
        try {
          digestHtml = await generateJobDigest(relevantFiltered, jobDetailMap)
        } catch (e) {
          console.error('[Scan] Digest generation failed:', e)
        }
      }
    } else {
      // No AI configured — mark all as relevant for demo purposes
      console.log('[Scan] No AI configured, using keyword fallback')
      relevantJobs = await analyzeJobs(newJobs)
    }

    // 4. Save all new jobs to database
    const analysisMap = new Map(relevantJobs.map((r) => [r.externalId, r]))

    for (const job of newJobs) {
      const analysis = analysisMap.get(job.externalId)
      await db.detectedJob.create({
        data: {
          externalId: job.externalId,
          title: job.title,
          location: job.location,
          department: job.department,
          url: job.url,
          description: job.description,
          jobType: analysis?.jobType || 'unknown',
          noCvRequired: analysis?.noCvRequired || false,
          aiAnalysis: analysis?.reasoning || '',
          isRelevant: analysis?.isRelevant || false,
        },
      })
    }

    // 5. Send notifications for relevant jobs
    const relevantFiltered = relevantJobs.filter((j) => j.isRelevant)
    let notificationsSent = 0

    if (relevantFiltered.length > 0 && emailConfigured) {
      console.log(`[Scan] Sending notifications for ${relevantFiltered.length} relevant jobs...`)

      const subscribers = await db.subscription.findMany({
        where: { active: true },
      })

      for (const subscriber of subscribers) {
        const jobCards = relevantFiltered.map((j) => {
          const detail = jobDetailMap.get(j.externalId)
          return {
            title: detail?.title || 'Unknown Job',
            location: detail?.location || 'UK',
            url: detail?.url || 'https://www.jobsatamazon.co.uk/app#/jobSearch',
            reasoning: j.reasoning,
          }
        })

        const result = await sendNewJobsAlert(subscriber.email, jobCards, digestHtml)

        await db.notificationLog.create({
          data: {
            subscriptionId: subscriber.id,
            type: 'new_job',
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.error,
          },
        })

        // Update notifiedAt on the jobs
        if (result.success) {
          for (const j of relevantFiltered) {
            await db.detectedJob.update({
              where: { externalId: j.externalId },
              data: { notifiedAt: new Date() },
            })
          }
          notificationsSent++
        }
      }
    }

    // 6. Log the scan
    await db.scanLog.create({
      data: {
        status: 'success',
        totalJobs: scrapedJobs.length,
        newJobs: newJobs.length,
        relevantJobs: relevantFiltered.length,
        durationMs: Date.now() - startTime,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Scan complete! Found ${newJobs.length} new jobs, ${relevantFiltered.length} relevant.`,
      stats: {
        totalScraped: scrapedJobs.length,
        newJobs: newJobs.length,
        relevantJobs: relevantFiltered.length,
        notificationsSent,
        durationMs: Date.now() - startTime,
      },
    })
  } catch (error) {
    console.error('[Scan] Error:', error)

    await db.scanLog.create({
      data: {
        status: 'error',
        errorMessage: (error as Error).message,
        durationMs: Date.now() - startTime,
      },
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Scan failed',
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
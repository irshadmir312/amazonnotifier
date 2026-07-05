import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      totalSubscribers,
      totalJobs,
      relevantJobs,
      totalScans,
      successfulScans,
      totalNotifications,
      successfulNotifications,
      recentJobs,
      recentScans,
    ] = await Promise.all([
      db.subscription.count({ where: { active: true } }),
      db.detectedJob.count(),
      db.detectedJob.count({ where: { isRelevant: true } }),
      db.scanLog.count(),
      db.scanLog.count({ where: { status: 'success' } }),
      db.notificationLog.count(),
      db.notificationLog.count({ where: { status: 'sent' } }),
      db.detectedJob.findMany({
        where: { isRelevant: true },
        orderBy: { detectedAt: 'desc' },
        take: 5,
      }),
      db.scanLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    const lastScan = recentScans[0] || null

    return NextResponse.json({
      subscribers: {
        total: totalSubscribers,
      },
      jobs: {
        total: totalJobs,
        relevant: relevantJobs,
        recent: recentJobs,
      },
      scans: {
        total: totalScans,
        successful: successfulScans,
        successRate: totalScans > 0 ? ((successfulScans / totalScans) * 100).toFixed(1) : '0',
        lastScan: lastScan
          ? {
              status: lastScan.status,
              totalJobs: lastScan.totalJobs,
              newJobs: lastScan.newJobs,
              relevantJobs: lastScan.relevantJobs,
              durationMs: lastScan.durationMs,
              createdAt: lastScan.createdAt,
            }
          : null,
        recent: recentScans,
      },
      notifications: {
        total: totalNotifications,
        successful: successfulNotifications,
      },
      config: {
        aiConfigured: Boolean(process.env.OPENAI_API_KEY),
        emailConfigured: Boolean(process.env.RESEND_API_KEY),
        scanInterval: process.env.SCAN_INTERVAL || '5 minutes',
      },
    })
  } catch (error) {
    console.error('[Stats] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
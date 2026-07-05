import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const relevantOnly = searchParams.get('relevant') === 'true'

    const where = relevantOnly ? { isRelevant: true } : {}

    const [jobs, total] = await Promise.all([
      db.detectedJob.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.detectedJob.count({ where }),
    ])

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[Get Jobs] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    const result = await db.detectedJob.deleteMany()
    return NextResponse.json({
      success: true,
      deleted: result.count,
    })
  } catch (error) {
    console.error('[Clear Jobs] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
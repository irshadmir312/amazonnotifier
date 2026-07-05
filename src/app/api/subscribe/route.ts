import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendTestEmail } from '@/lib/email'
import { z } from 'zod/v4'

const subscribeSchema = z.object({
  email: z.email('Please enter a valid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = subscribeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Check if already subscribed
    const existing = await db.subscription.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      if (existing.active) {
        return NextResponse.json({
          success: true,
          message: 'You are already subscribed!',
          email: normalizedEmail,
        })
      } else {
        // Reactivate
        await db.subscription.update({
          where: { email: normalizedEmail },
          data: { active: true, updatedAt: new Date() },
        })

        // Try to send confirmation email
        const emailResult = await sendTestEmail(normalizedEmail)

        return NextResponse.json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.',
          email: normalizedEmail,
          emailSent: emailResult.success,
        })
      }
    }

    // Create new subscription
    await db.subscription.create({
      data: {
        email: normalizedEmail,
        active: true,
      },
    })

    // Try to send confirmation email
    const emailResult = await sendTestEmail(normalizedEmail)

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed! Check your email for confirmation.',
        email: normalizedEmail,
        emailSent: emailResult.success,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('[Subscribe] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await db.subscription.update({
      where: { email: email.toLowerCase().trim() },
      data: { active: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully.',
    })
  } catch (error) {
    console.error('[Unsubscribe] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const subscribers = await db.subscription.findMany({
      where: { active: true },
      select: { id: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    const count = await db.subscription.count({ where: { active: true } })

    return NextResponse.json({
      subscribers,
      totalActive: count,
    })
  } catch (error) {
    console.error('[Get Subscribers] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
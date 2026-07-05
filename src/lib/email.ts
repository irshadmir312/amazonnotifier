import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export async function sendJobNotification(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient()
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    const { data, error } = await resend.emails.send({
      from: `Amazon Jobs Monitor <${fromEmail}>`,
      to: [to],
      subject,
      html: wrapEmailTemplate(htmlContent),
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  const html = `
    <div style="text-align: center; padding: 40px 20px;">
      <h1 style="color: #FF9900; font-size: 24px;">✅ Subscription Confirmed!</h1>
      <p style="font-size: 16px; color: #666; margin-top: 16px;">
        You're now monitoring Amazon UK for hourly jobs that don't require a CV.
      </p>
      <p style="font-size: 16px; color: #666;">
        We scan every 5 minutes and will email you the moment a matching job appears.
      </p>
      <div style="margin-top: 30px; padding: 20px; background: #FFF3E0; border-radius: 12px;">
        <p style="margin: 0; color: #E65100;">
          <strong>What you'll be notified about:</strong><br/>
          ✓ Hourly warehouse/fulfillment jobs<br/>
          ✓ No CV required positions<br/>
          ✓ UK-based Amazon jobs
        </p>
      </div>
    </div>
  `

  return sendJobNotification(to, '✅ Amazon Jobs Monitor — You\'re Subscribed!', html)
}

export async function sendNewJobsAlert(
  to: string,
  jobs: { title: string; location: string; url: string; reasoning: string }[],
  digestHtml: string,
): Promise<{ success: boolean; error?: string }> {
  const jobCards = jobs.map((job) => `
    <div style="border: 1px solid #FFE0B2; border-left: 4px solid #FF9900; padding: 16px; margin: 12px 0; border-radius: 0 8px 8px 0; background: #FFFBF5;">
      <h3 style="margin: 0 0 8px 0; color: #333;">${job.title}</h3>
      <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">📍 ${job.location}</p>
      <p style="margin: 0 0 12px 0; color: #888; font-size: 13px; font-style: italic;">${job.reasoning}</p>
      <a href="${job.url}" target="_blank" 
         style="display: inline-block; background: #FF9900; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
        Apply Now →
      </a>
    </div>
  `).join('')

  const html = `
    <div style="text-align: center; padding: 20px 0 30px;">
      <h1 style="color: #FF9900; font-size: 28px; margin: 0;">🚨 ${jobs.length} New Job${jobs.length > 1 ? 's' : ''} Found!</h1>
      <p style="color: #666; font-size: 16px; margin-top: 8px;">
        Amazon UK hourly positions — no CV required
      </p>
    </div>
    ${digestHtml ? `<div style="margin-bottom: 20px; padding: 16px; background: #F5F5F5; border-radius: 8px; font-size: 14px; color: #555;">${digestHtml}</div>` : ''}
    ${jobCards}
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://www.jobsatamazon.co.uk/app#/jobSearch" target="_blank"
         style="display: inline-block; background: #232F3E; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
        View All Jobs on Amazon →
      </a>
    </div>
  `

  return sendJobNotification(
    to,
    `🚨 ${jobs.length} New Amazon UK Job${jobs.length > 1 ? 's' : ''} — Apply Now!`,
    html,
  )
}

function wrapEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin: 20px 0;">
              <tr>
                <td style="background: linear-gradient(135deg, #232F3E 0%, #37475A 100%); padding: 24px 32px; text-align: center;">
                  <h1 style="margin: 0; color: #FF9900; font-size: 22px; font-weight: 700;">📦 Amazon Jobs Monitor</h1>
                  <p style="margin: 4px 0 0 0; color: #aaa; font-size: 13px;">Hourly Jobs • No CV Required • UK</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="background: #f5f5f5; padding: 20px 32px; text-align: center; border-top: 1px solid #eee;">
                  <p style="margin: 0; color: #999; font-size: 12px;">
                    You received this because you subscribed to Amazon Jobs Monitor.
                  </p>
                  <p style="margin: 8px 0 0 0; color: #bbb; font-size: 11px;">
                    Instant apply • No browser needed • AI-powered filtering
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}
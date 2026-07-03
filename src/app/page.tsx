'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Download,
  RefreshCw,
  Volume2,
  Bell,
  ClipboardList,
  BrainCircuit,
  Settings,
  Shield,
  Zap,
  ArrowRight,
  Chrome,
  ExternalLink,
  Package,
  Loader2,
  CheckCircle2,
  MousePointerClick,
  Eye,
  Copy,
  ChevronRight,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

interface Feature {
  icon: React.ElementType
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: RefreshCw,
    title: 'Auto Refresh',
    description:
      'Automatically refreshes the Amazon Jobs page at a configurable interval (default 30s) so you never have to manually reload.',
  },
  {
    icon: Volume2,
    title: 'Sound Alerts',
    description:
      'Plays a pleasant chime notification the moment a new job is detected, so you can react instantly even when the tab is in the background.',
  },
  {
    icon: Bell,
    title: 'Desktop Notifications',
    description:
      'Sends native system-level notification popups so you are alerted even when Chrome is minimized.',
  },
  {
    icon: ClipboardList,
    title: 'Job Tracking',
    description:
      'Maintains a full log of every newly detected job with title, location, and timestamp.',
  },
  {
    icon: BrainCircuit,
    title: 'Smart Detection',
    description:
      'Intelligently compares page state before and after refresh to identify genuinely new postings.',
  },
  {
    icon: Settings,
    title: 'Easy Settings',
    description:
      'Configure refresh interval, toggle sound/notifications, and manage everything from a clean popup.',
  },
]

const steps = [
  {
    number: 1,
    title: 'Download & Install',
    description:
      'Click the download button, unzip, and load the extension as an unpacked extension in Chrome.',
  },
  {
    number: 2,
    title: 'Open Amazon Jobs',
    description:
      'Navigate to the Amazon UK jobs page and keep the tab open in the background.',
  },
  {
    number: 3,
    title: 'Get Notified Instantly',
    description:
      'The extension monitors the page every 30 seconds and alerts you with sound + notification.',
  },
]

const installSteps = [
  { step: 1, text: 'Download the extension ZIP file by clicking the button above.' },
  { step: 2, text: 'Extract the ZIP to a folder on your computer.' },
  { step: 3, text: 'Open Chrome and navigate to the extensions page.' },
  {
    step: 4,
    text: 'Enable "Developer mode" using the toggle in the top-right corner.',
  },
  {
    step: 5,
    text: 'Click "Load unpacked" and select the extracted folder.',
  },
  {
    step: 6,
    text: 'The extension icon appears in your toolbar — click it to start monitoring!',
  },
]

const faqs = [
  {
    question: 'Does this extension work on Amazon job sites other than the UK?',
    answer:
      'Currently, the extension is optimized for jobsatamazon.co.uk. However, the detection logic uses generic heuristics that may work on other Amazon jobs sites. You can try it on any Amazon jobs page.',
  },
  {
    question: 'Will refreshing the page log me out?',
    answer:
      'The extension refreshes the tab which may require you to be logged in. Make sure you stay logged in to the Amazon jobs site. Most job search pages do not require authentication.',
  },
  {
    question: 'Can I customize the refresh interval?',
    answer:
      'Yes! Open the extension popup, click the settings icon, and choose from 15 seconds, 30 seconds, 1 minute, 2 minutes, or 5 minutes. The default is 30 seconds.',
  },
  {
    question: 'Does it consume a lot of memory or CPU?',
    answer:
      'No. The extension is very lightweight — it only runs a simple timer in the background and scrapes the page DOM when refreshing. There are no heavy computations or network requests (other than the page refresh itself).',
  },
  {
    question: 'Is my data safe?',
    answer:
      'Absolutely. The extension stores all data locally in your browser using Chrome\'s storage API. No data is sent to any external server. The extension is also open-source so you can inspect the code.',
  },
  {
    question: 'How does the sound notification work?',
    answer:
      'When a new job is detected, the extension plays a pleasant three-tone chime using the Web Audio API. This works even when the tab is in the background. You can toggle sound on/off in settings.',
  },
]

function BrowserMockup() {
  const sampleJobs = [
    { title: 'Software Development Engineer II', location: 'London, UK', time: '2m ago' },
    { title: 'Solutions Architect', location: 'Manchester, UK', time: '5m ago' },
    { title: 'Data Scientist — ML', location: 'Edinburgh, UK', time: '8m ago' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="relative"
    >
      {/* Browser chrome */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-2xl shadow-black/5 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 bg-neutral-100 px-4 py-2.5 border-b border-neutral-200">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white rounded-md px-3 py-1 text-[10px] text-neutral-400 border border-neutral-200 max-w-[220px] w-full text-center truncate">
              jobsatamazon.co.uk/app#/jobSearch
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="relative bg-neutral-50 p-4 min-h-[200px]">
          {/* Extension popup overlay */}
          <div className="absolute right-4 top-4 w-[200px] rounded-lg border border-neutral-200 bg-white shadow-xl shadow-black/10 overflow-hidden z-10">
            <div className="bg-gradient-to-r from-[#FF9900] to-[#E68A00] px-3 py-2">
              <div className="text-[10px] font-bold text-white">Amazon Jobs Monitor</div>
              <div className="text-[8px] text-white/70">● Monitoring</div>
            </div>
            <div className="p-2 space-y-1.5">
              <div className="flex justify-between text-[8px]">
                <span className="text-neutral-500">New Jobs</span>
                <span className="font-bold text-[#FF9900]">3</span>
              </div>
              {sampleJobs.map((job, i) => (
                <div key={i} className="p-1.5 bg-[#FFF5E6] rounded text-[7px] leading-tight">
                  <div className="font-semibold text-neutral-800 truncate">{job.title}</div>
                  <div className="text-neutral-500">{job.location} · {job.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Background job listings */}
          <div className="space-y-2 max-w-[280px]">
            <div className="text-xs font-bold text-neutral-400 mb-3">Job Search Results</div>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-10 bg-white rounded-lg border border-neutral-200/80" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Home() {
  const [downloading, setDownloading] = useState(false)
  const { toast } = useToast()

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/download-extension')
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'amazon-jobs-monitor-extension.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: 'Download started!', description: 'Extract and load in Chrome.' })
    } catch {
      toast({ title: 'Download failed', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setDownloading(false)
    }
  }, [toast])

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      {/* ──────────────── STICKY NAV ──────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-md"
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF9900]">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-neutral-900">Amazon Jobs Monitor</span>
            <Badge className="bg-[#FFF5E6] text-[#CC7A00] hover:bg-[#FFF5E6] border-[#FFE0B2] text-[10px] font-semibold px-2 py-0">
              v1.0
            </Badge>
          </div>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-[#FF9900] text-white hover:bg-[#E68A00] focus-visible:ring-[#FF9900]/30 h-8 gap-1.5 text-xs font-semibold px-3 sm:px-4"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Download</span>
          </Button>
        </nav>
      </motion.header>

      <main className="flex-1">
        {/* ──────────────── HERO ──────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FFFAF2] via-white to-white" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#FF9900]/[0.04] rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center">
              <div>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                  className="flex flex-col gap-5"
                >
                  <motion.div variants={fadeUp} transition={{ delay: 0.1 }}>
                    <Badge className="bg-[#FFF5E6] text-[#CC7A00] hover:bg-[#FFEDCC] border-[#FFE0B2] text-xs font-semibold px-3 py-1 gap-1.5">
                      <Zap className="h-3 w-3" />
                      Free &amp; Open Source
                    </Badge>
                  </motion.div>

                  <motion.h1
                    variants={fadeUp}
                    transition={{ delay: 0.2 }}
                    className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-neutral-900 leading-[1.1]"
                  >
                    Never Miss an{' '}
                    <span className="bg-gradient-to-r from-[#FF9900] to-[#E68A00] bg-clip-text text-transparent">
                      Amazon Job
                    </span>
                  </motion.h1>

                  <motion.p
                    variants={fadeUp}
                    transition={{ delay: 0.3 }}
                    className="max-w-lg text-base sm:text-lg text-neutral-500 leading-relaxed"
                  >
                    Auto-monitor Amazon Jobs pages, get instant sound &amp; desktop alerts when new
                    positions are posted — all from a lightweight Chrome extension.
                  </motion.p>

                  <motion.div variants={fadeUp} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleDownload}
                      disabled={downloading}
                      size="lg"
                      className="bg-[#FF9900] text-white hover:bg-[#E68A00] h-12 text-base font-semibold gap-2.5 px-6 rounded-xl shadow-lg shadow-[#FF9900]/20 hover:shadow-xl hover:shadow-[#FF9900]/25 transition-shadow"
                    >
                      {downloading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                      Download Extension
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-12 text-base font-medium gap-2 px-6 rounded-xl border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                      onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Learn More
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>

                  <motion.div variants={fadeUp} transition={{ delay: 0.5 }} className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <Chrome className="h-3.5 w-3.5" />
                      <span>Chrome</span>
                    </div>
                    <div className="h-3.5 w-px bg-neutral-200" />
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <Package className="h-3.5 w-3.5" />
                      <span>No sign-up</span>
                    </div>
                    <div className="h-3.5 w-px bg-neutral-200" />
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <Shield className="h-3.5 w-3.5" />
                      <span>Privacy-first</span>
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              <div className="hidden lg:block">
                <BrowserMockup />
              </div>
            </div>

            <div className="lg:hidden mt-10">
              <BrowserMockup />
            </div>
          </div>
        </section>

        {/* ──────────────── FEATURES ──────────────── */}
        <section className="py-16 sm:py-20 bg-neutral-50/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp} transition={{ delay: 0.1 }}>
                <Badge variant="secondary" className="mb-3 bg-[#FFF5E6] text-[#CC7A00] hover:bg-[#FFF5E6] text-xs font-semibold px-3 py-1">
                  Features
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} transition={{ delay: 0.2 }} className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Everything you need to stay ahead
              </motion.h2>
              <motion.p variants={fadeUp} transition={{ delay: 0.3 }} className="mt-3 text-neutral-500 max-w-xl mx-auto">
                A small but powerful toolkit designed to give you the edge in the competitive Amazon job market.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={staggerContainer}
              className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature, i) => (
                <motion.div key={feature.title} variants={fadeUp} transition={{ delay: i * 0.08 }}>
                  <Card className="group h-full border-neutral-200/80 bg-white hover:shadow-lg hover:shadow-neutral-200/50 hover:border-neutral-300/80 transition-all duration-300 hover:-translate-y-0.5">
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF5E6] text-[#FF9900] group-hover:bg-[#FF9900] group-hover:text-white transition-colors duration-300">
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base font-semibold text-neutral-900">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed text-neutral-500">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ──────────────── HOW IT WORKS ──────────────── */}
        <section id="how-it-works" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp} transition={{ delay: 0.1 }}>
                <Badge variant="secondary" className="mb-3 bg-[#FFF5E6] text-[#CC7A00] hover:bg-[#FFF5E6] text-xs font-semibold px-3 py-1">
                  How It Works
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} transition={{ delay: 0.2 }} className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Up and running in under 2 minutes
              </motion.h2>
              <motion.p variants={fadeUp} transition={{ delay: 0.3 }} className="mt-3 text-neutral-500 max-w-xl mx-auto">
                Three simple steps between you and real-time job alerts.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={staggerContainer}
              className="grid gap-6 sm:gap-8 md:grid-cols-3"
            >
              {steps.map((step) => (
                <motion.div
                  key={step.number}
                  variants={fadeUp}
                  transition={{ delay: step.number * 0.15 }}
                  className="relative flex flex-col items-center text-center"
                >
                  {step.number < steps.length && (
                    <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-px border-t-2 border-dashed border-neutral-200" />
                  )}
                  <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF9900] text-white text-lg font-bold shadow-lg shadow-[#FF9900]/20">
                    {step.number}
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed max-w-xs">{step.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ──────────────── INSTALLATION GUIDE ──────────────── */}
        <section className="py-16 sm:py-20 bg-neutral-50/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp} transition={{ delay: 0.1 }}>
                <Badge variant="secondary" className="mb-3 bg-[#FFF5E6] text-[#CC7A00] hover:bg-[#FFF5E6] text-xs font-semibold px-3 py-1">
                  Installation
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} transition={{ delay: 0.2 }} className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Load the extension in Chrome
              </motion.h2>
              <motion.p variants={fadeUp} transition={{ delay: 0.3 }} className="mt-3 text-neutral-500 max-w-xl mx-auto">
                Follow these steps to install the unpacked extension.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={staggerContainer}
              className="mx-auto max-w-2xl"
            >
              <Card className="border-neutral-200/80 overflow-hidden">
                <CardContent className="p-0">
                  {installSteps.map((item, i) => (
                    <motion.div
                      key={item.step}
                      variants={fadeUp}
                      transition={{ delay: i * 0.08 }}
                      className={`flex gap-4 p-4 sm:p-5 ${
                        i < installSteps.length - 1 ? 'border-b border-neutral-100' : ''
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF9900]/10 text-[#FF9900] text-sm font-bold">
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-700 leading-relaxed">{item.text}</p>
                      </div>
                      {i < installSteps.length - 1 && (
                        <div className="hidden sm:flex items-center">
                          <ChevronRight className="h-4 w-4 text-neutral-300" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ──────────────── FAQ ──────────────── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp} transition={{ delay: 0.1 }}>
                <Badge variant="secondary" className="mb-3 bg-[#FFF5E6] text-[#CC7A00] hover:bg-[#FFF5E6] text-xs font-semibold px-3 py-1">
                  FAQ
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} transition={{ delay: 0.2 }} className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Frequently asked questions
              </motion.h2>
              <motion.p variants={fadeUp} transition={{ delay: 0.3 }} className="mt-3 text-neutral-500 max-w-xl mx-auto">
                Everything you need to know about using the extension.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fadeUp}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl"
            >
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-neutral-200/80">
                    <AccordionTrigger className="text-left text-sm font-semibold text-neutral-800 hover:no-underline hover:text-[#FF9900] transition-colors py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-neutral-500 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* ──────────────── CTA BANNER ──────────────── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF9900] to-[#E68A00] px-6 py-12 sm:px-12 sm:py-16 text-center"
            >
              <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />

              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Start monitoring Amazon Jobs today
                </h2>
                <p className="mt-3 text-white/80 max-w-md mx-auto text-sm sm:text-base">
                  Free, lightweight, and private. Download the extension and never miss a new opportunity again.
                </p>
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  size="lg"
                  className="mt-6 h-12 bg-white text-[#CC7A00] hover:bg-neutral-50 text-base font-semibold gap-2 px-6 rounded-xl shadow-lg"
                >
                  {downloading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  Download Extension — It&apos;s Free
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ──────────────── FOOTER ──────────────── */}
      <footer className="mt-auto border-t border-neutral-100 bg-neutral-50/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FF9900]">
                <Shield className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-neutral-700">Amazon Jobs Monitor</span>
            </div>
            <p className="text-xs text-neutral-400">
              &copy; {new Date().getFullYear()} Amazon Jobs Monitor. Not affiliated with Amazon.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
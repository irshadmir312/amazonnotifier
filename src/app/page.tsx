'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import {
  BrainCircuit,
  Zap,
  Mail,
  Target,
  Shield,
  BarChart3,
  Loader2,
  ArrowRight,
  Menu,
  Clock,
  Package,
  Search,
  Users,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Sparkles,
} from 'lucide-react'

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}

/* ─── Types ─── */
interface Stats {
  totalScans: number
  jobsDetected: number
  relevantJobs: number
  activeSubscribers: number
  lastScanAt: string | null
  nextScanIn: number | null
}

interface Job {
  id: string
  title: string
  location: string
  detectedAt: string
  url?: string
}

/* ─── Data ─── */
const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Live Stats', href: '#stats' },
  { label: 'FAQ', href: '#faq' },
]

const howItWorksSteps = [
  {
    number: '01',
    icon: Mail,
    title: 'Subscribe with Email',
    description: 'Just enter your email, no signup needed. No passwords, no accounts — just your email address.',
  },
  {
    number: '02',
    icon: Search,
    title: 'AI Scans Amazon Jobs',
    description: 'Every 5 minutes, our AI checks Amazon UK for new hourly positions using intelligent web scraping.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Get Instant Alerts',
    description: 'Receive a beautifully formatted email the moment a matching job is found, with a direct apply link.',
  },
]

const features = [
  {
    icon: BrainCircuit,
    title: 'AI-Powered Filtering',
    description: 'Uses GPT/DeepSeek to intelligently filter for hourly jobs that don\'t require CVs — no false positives.',
  },
  {
    icon: Zap,
    title: '5-Minute Scanning',
    description: 'Server-side cron checks Amazon jobs every 5 minutes automatically, 24/7 — even while you sleep.',
  },
  {
    icon: Mail,
    title: 'Instant Email Alerts',
    description: 'Beautiful email notifications with direct apply links the moment a job matches your criteria.',
  },
  {
    icon: Target,
    title: 'Smart Targeting',
    description: 'Only data warehouse, fulfillment, and logistics hourly roles — no office or corporate jobs.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Just your email, nothing else. No passwords, no accounts, no tracking. Unsubscribe anytime.',
  },
  {
    icon: BarChart3,
    title: 'Live Dashboard',
    description: 'Real-time stats showing scans, jobs found, and system health — full transparency.',
  },
]

const faqs = [
  {
    question: 'How does this work?',
    answer:
      'We run a server-side monitor that scrapes Amazon UK\'s jobs page every 5 minutes. When a new hourly job is found, our AI analyzes it to confirm it doesn\'t require a CV. If it matches, we immediately send you an email with the job details and a direct apply link.',
  },
  {
    question: 'What jobs will I be notified about?',
    answer:
      'You\'ll only receive alerts for hourly-paid Amazon UK jobs that don\'t require a CV. This includes warehouse operatives, fulfillment center associates, delivery drivers, sorting center staff, and similar logistics roles.',
  },
  {
    question: 'How often does it scan?',
    answer:
      'Our system scans Amazon UK jobs every 5 minutes, 24 hours a day, 7 days a week. This ensures you\'re among the first to know when a new position opens up.',
  },
  {
    question: 'Is it free?',
    answer:
      'Yes, completely free! We believe everyone should have equal access to Amazon job opportunities. There are no premium tiers, hidden fees, or credit card requirements.',
  },
  {
    question: 'How do I unsubscribe?',
    answer:
      'Every email alert includes a one-click unsubscribe link. You can also email us at any time to be removed from the list. No questions asked.',
  },
  {
    question: 'Can I use this alongside the Chrome extension?',
    answer:
      'Absolutely! This service is designed to complement browser-based monitoring. While the extension works when your browser is open, our server-side monitor runs 24/7 — so you get coverage even when your computer is off.',
  },
]

/* ─── Main Component ─── */
export default function HomePage() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [heroLoading, setHeroLoading] = useState(false)
  const [ctaEmail, setCtaEmail] = useState('')
  const [ctaLoading, setCtaLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [scanLoading, setScanLoading] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  /* ─── Scroll listener for sticky nav ─── */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  /* ─── Smooth scroll handler ─── */
  const scrollTo = useCallback((href: string) => {
    setMobileMenuOpen(false)
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  /* ─── Subscribe handler ─── */
  const handleSubscribe = useCallback(
    async (emailVal: string, setLoading: (v: boolean) => void, clearEmail: () => void) => {
      if (!emailVal.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' })
        return
      }
      setLoading(true)
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal }),
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: '🎉 Subscribed!', description: data.message || 'You\'ll receive alerts at ' + emailVal })
          clearEmail()
        } else {
          toast({ title: 'Subscription failed', description: data.error || 'Something went wrong. Please try again.', variant: 'destructive' })
        }
      } catch {
        toast({ title: 'Network error', description: 'Could not reach the server. Please try again later.', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  /* ─── Fetch stats ─── */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // silently fail — stats section shows zeros
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [])

  /* ─── Fetch recent jobs ─── */
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/jobs?limit=5&relevant=true')
        if (res.ok) {
          const data = await res.json()
          setJobs(Array.isArray(data) ? data : data.jobs || [])
        }
      } catch {
        // silently fail
      } finally {
        setJobsLoading(false)
      }
    }
    fetchJobs()
  }, [])

  /* ─── Manual scan ─── */
  const handleManualScan = useCallback(async () => {
    setScanLoading(true)
    try {
      const res = await fetch('/api/scan', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '✅ Scan triggered', description: data.message || 'Scan completed successfully!' })
        // Refresh stats
        const statsRes = await fetch('/api/stats')
        if (statsRes.ok) setStats(await statsRes.json())
        const jobsRes = await fetch('/api/jobs?limit=5&relevant=true')
        if (jobsRes.ok) {
          const jd = await jobsRes.json()
          setJobs(Array.isArray(jd) ? jd : jd.jobs || [])
        }
      } else {
        toast({ title: 'Scan failed', description: data.error || 'Could not trigger scan.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not reach the server.', variant: 'destructive' })
    } finally {
      setScanLoading(false)
    }
  }, [toast])

  /* ─── Helpers ─── */
  const formatTimeAgo = useCallback((dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ${mins % 60}m ago`
    return `${Math.floor(hrs / 24)}d ago`
  }, [])

  const formatJobTime = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }, [])

  const statCards = [
    { label: 'Total Scans', value: stats?.totalScans ?? 0, icon: Clock, color: 'text-orange-400' },
    { label: 'Jobs Detected', value: stats?.jobsDetected ?? 0, icon: Package, color: 'text-emerald-400' },
    { label: 'Relevant Jobs', value: stats?.relevantJobs ?? 0, icon: Target, color: 'text-amber-400' },
    { label: 'Active Subscribers', value: stats?.activeSubscribers ?? 0, icon: Users, color: 'text-sky-400' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ═══════════════ NAVIGATION ═══════════════ */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <span className="text-2xl">📦</span>
            <span className="text-lg font-bold text-[#FF9900] tracking-tight group-hover:opacity-80 transition-opacity">
              Amazon Jobs Monitor
            </span>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-sm font-medium text-gray-600 hover:text-[#FF9900] transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Button
              onClick={() => scrollTo('#hero-form')}
              className="bg-[#FF9900] hover:bg-[#E68A00] text-white font-semibold text-sm px-5"
            >
              Subscribe Free
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5 text-gray-700" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-[#FF9900] flex items-center gap-2">
                  <span>📦</span> Amazon Jobs Monitor
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-4">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <button
                      onClick={() => scrollTo(link.href)}
                      className="text-left px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[#FF9900] transition-colors font-medium"
                    >
                      {link.label}
                    </button>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Button
                    onClick={() => scrollTo('#hero-form')}
                    className="mt-4 bg-[#FF9900] hover:bg-[#E68A00] text-white font-semibold w-full"
                  >
                    Subscribe Free
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </header>

      <main className="flex-1">
        {/* ═══════════════ HERO SECTION ═══════════════ */}
        <section ref={heroRef} className="relative overflow-hidden bg-white pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-32 lg:pb-36">
          {/* Animated background orbs */}
          <motion.div
            style={{ y: heroY }}
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-orange-100/60 blur-3xl" />
            <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-amber-100/50 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-yellow-50/70 blur-3xl" />
          </motion.div>

          <motion.div
            style={{ opacity: heroOpacity }}
            className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center"
          >
            {/* Trust badges */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="flex flex-wrap justify-center gap-3 mb-8"
            >
              {['🔒 No password needed', '⚡ 5-min scans', '🤖 AI filtering'].map((badge) => (
                <motion.span
                  key={badge}
                  variants={fadeUp}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm"
                >
                  {badge}
                </motion.span>
              ))}
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]"
            >
              Never Miss an{' '}
              <span className="text-[#FF9900]">Amazon UK</span>{' '}
              Hourly Job Again
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { delay: 0.1 } } }}
              className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-500 leading-relaxed"
            >
              AI-powered monitoring scans every 5 minutes. Get instant email alerts for
              warehouse &amp; fulfillment jobs that don&apos;t need a CV.
            </motion.p>

            {/* Email Form */}
            <motion.div
              id="hero-form"
              initial="hidden"
              animate="visible"
              variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { delay: 0.2 } } }}
              className="mt-10 max-w-lg mx-auto"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubscribe(email, setHeroLoading, () => setEmail(''))
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-13 pl-11 text-base rounded-xl border-gray-300 focus:border-[#FF9900] focus:ring-[#FF9900]/20"
                    disabled={heroLoading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={heroLoading}
                  className="h-13 px-8 bg-[#FF9900] hover:bg-[#E68A00] text-white font-semibold text-base rounded-xl shadow-lg shadow-orange-200/50 hover:shadow-orange-300/60 transition-all"
                >
                  {heroLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing…
                    </>
                  ) : (
                    <>
                      Subscribe &amp; Monitor
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              <p className="mt-3 text-xs text-gray-400">
                Free forever • No spam • Unsubscribe anytime
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section id="how-it-works" className="bg-[#F5F5F5] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-center mb-16"
            >
              <span className="inline-block text-sm font-semibold text-[#FF9900] tracking-wide uppercase mb-3">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Three Simple Steps
              </h2>
              <p className="mt-4 text-gray-500 max-w-xl mx-auto">
                No signups, no passwords, no hassle. Just enter your email and let our AI do the work.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={staggerContainer}
              className="relative grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
            >
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[#FF9900]/30 via-[#FF9900]/60 to-[#FF9900]/30" />

              {howItWorksSteps.map((step, i) => (
                <motion.div key={step.number} variants={fadeUp} className="relative text-center">
                  {/* Step number circle */}
                  <div className="relative mx-auto mb-6">
                    <div className="w-32 h-32 rounded-2xl bg-white shadow-lg shadow-gray-200/60 flex items-center justify-center border border-gray-100 mx-auto">
                      <step.icon className="w-14 h-14 text-[#FF9900]" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-[#FF9900] text-white text-sm font-bold flex items-center justify-center shadow-md">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">{step.description}</p>
                  {/* Arrow (mobile) */}
                  {i < howItWorksSteps.length - 1 && (
                    <div className="md:hidden flex justify-center my-6">
                      <ArrowRight className="w-6 h-6 text-[#FF9900]/50 rotate-90" />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════ FEATURES GRID ═══════════════ */}
        <section id="features" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-center mb-16"
            >
              <span className="inline-block text-sm font-semibold text-[#FF9900] tracking-wide uppercase mb-3">
                Features
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Everything You Need
              </h2>
              <p className="mt-4 text-gray-500 max-w-xl mx-auto">
                Powerful, automated, and privacy-first — built to give you an unfair advantage.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {features.map((feature) => (
                <motion.div key={feature.title} variants={fadeUp}>
                  <Card className="h-full border border-gray-100 hover:shadow-lg hover:shadow-gray-200/40 transition-all duration-300 hover:-translate-y-0.5 rounded-xl overflow-hidden">
                    <CardContent className="p-6 flex gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-[#FF9900]/10 flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-[#FF9900]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════ LIVE STATS ═══════════════ */}
        <section id="stats" className="bg-[#232F3E] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-center mb-16"
            >
              <span className="inline-block text-sm font-semibold text-[#FF9900] tracking-wide uppercase mb-3">
                Live Stats
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Real-Time Monitoring Data
              </h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                Full transparency — see exactly what our system is doing right now.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={staggerContainer}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {statsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                      <Skeleton className="h-10 w-16 mb-3 bg-white/10" />
                      <Skeleton className="h-4 w-24 bg-white/10" />
                    </div>
                  ))
                : statCards.map((stat) => (
                    <motion.div key={stat.label} variants={scaleIn}>
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 text-center hover:bg-white/10 transition-colors">
                        <stat.icon className={`w-6 h-6 mx-auto mb-3 ${stat.color}`} />
                        <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1">
                          {stat.value.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">{stat.label}</div>
                      </div>
                    </motion.div>
                  ))}
            </motion.div>

            {/* Scan info and manual trigger */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mt-10 text-center"
            >
              {!statsLoading && stats && (
                <p className="text-gray-400 text-sm mb-5">
                  Last scan: {formatTimeAgo(stats.lastScanAt)}
                  {stats.nextScanIn !== null && stats.nextScanIn > 0
                    ? ` • Next scan in ${stats.nextScanIn} min`
                    : ' • Next scan imminent'}
                </p>
              )}
              <Button
                onClick={handleManualScan}
                disabled={scanLoading}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 hover:text-white px-6"
              >
                {scanLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Trigger Manual Scan
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════ RECENT JOBS ═══════════════ */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-center mb-12"
            >
              <span className="inline-block text-sm font-semibold text-[#FF9900] tracking-wide uppercase mb-3">
                Recent Jobs
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Latest Relevant Jobs Detected
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={fadeIn}
            >
              {jobsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-4">
                      <Skeleton className="h-5 w-3/5 mb-2" />
                      <Skeleton className="h-4 w-2/5" />
                    </div>
                  ))}
                </div>
              ) : jobs.length > 0 ? (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <Card key={job.id} className="border border-gray-100 hover:shadow-md transition-shadow rounded-xl">
                      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <Package className="w-5 h-5 text-[#FF9900] shrink-0 mt-0.5" />
                            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.location}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatJobTime(job.detectedAt)}
                            </span>
                          </div>
                        </div>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 shrink-0 text-sm font-medium text-[#FF9900] hover:text-[#E68A00] transition-colors"
                          >
                            Apply <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-[#F5F5F5] rounded-2xl">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No jobs detected yet
                  </h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Subscribe to start monitoring — we&apos;ll find relevant hourly jobs for you!
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════ FAQ ═══════════════ */}
        <section id="faq" className="bg-[#F5F5F5] py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-center mb-12"
            >
              <span className="inline-block text-sm font-semibold text-[#FF9900] tracking-wide uppercase mb-3">
                FAQ
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Frequently Asked Questions
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={fadeIn}
            >
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-gray-200">
                    <AccordionTrigger className="text-left text-base font-medium text-gray-900 hover:text-[#FF9900] transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-500 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════ CTA SECTION ═══════════════ */}
        <section className="relative overflow-hidden py-20 sm:py-24">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF9900] via-[#FF8800] to-[#E68A00]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Start Monitoring Now
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Join hundreds of job seekers who never miss an Amazon UK hourly opportunity.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubscribe(ctaEmail, setCtaLoading, () => setCtaEmail(''))
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={ctaEmail}
                  onChange={(e) => setCtaEmail(e.target.value)}
                  required
                  className="h-12 pl-11 rounded-xl bg-white/15 backdrop-blur-sm border-white/25 text-white placeholder:text-white/50 focus:border-white focus:ring-white/20"
                  disabled={ctaLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={ctaLoading}
                className="h-12 px-7 bg-white text-[#FF9900] hover:bg-gray-50 font-bold rounded-xl shadow-lg transition-all"
              >
                {ctaLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subscribing…
                  </>
                ) : (
                  <>
                    Subscribe
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </section>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="mt-auto bg-[#232F3E] border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="text-lg font-bold text-[#FF9900] flex items-center gap-2">
                <span>📦</span> Amazon Jobs Monitor
              </span>
              <span className="text-xs text-gray-500">
                Not affiliated with Amazon.com, Inc.
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <button className="hover:text-white transition-colors">Privacy</button>
              <button className="hover:text-white transition-colors">Terms</button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Amazon Jobs Monitor. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
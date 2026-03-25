/**
 * Cleanse Analysis Dashboard — Client-side real-time controller.
 *
 * Polls the server-side API proxy endpoints every 3 seconds while an
 * analysis operation is Running or Cancelling, and updates the hero
 * widget metrics, progress bar, and throttle policy switcher in place.
 */

const NUM_FORMAT = new Intl.NumberFormat('en-GB')
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const POLL_INTERVAL_MS = 3000
const MAX_CONSECUTIVE_FAILURES = 5

// ─── Formatters ───────────────────────────────────────────

function formatNumber(n) {
  return n != null ? NUM_FORMAT.format(Math.round(n)) : '—'
}

function formatDate(iso) {
  if (!iso) return '—'
  return DATE_FORMAT.format(new Date(iso))
}

function formatDurationSeconds(totalSec) {
  if (totalSec == null) return 'Calculating…'
  const s = Math.round(totalSec)
  if (s < 60) return `${s}s`
  if (s < 3600) {
    const m = Math.floor(s / 60)
    return `${m}m ${s % 60}s`
  }
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

// ─── Helpers ──────────────────────────────────────────────

function setText(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

function show(id) {
  const el = document.getElementById(id)
  if (el) el.classList.remove('app-hidden')
}

function hide(id) {
  const el = document.getElementById(id)
  if (el) el.classList.add('app-hidden')
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ─── Dashboard Class ──────────────────────────────────────

class CleanseDashboard {
  constructor() {
    this.polling = false
    this.pollTimer = null
    this.fetchInFlight = false
    this.consecutiveFailures = 0
    this.activeRun = null
    this.policies = []

    this.init()
  }

  init() {
    const dataEl = document.getElementById('cleanse-initial-data')
    if (dataEl) {
      try {
        const data = JSON.parse(dataEl.textContent)
        this.activeRun = data.activeRun
        this.policies = data.policies || []
      } catch {
        // Ignore parse errors — proceed with defaults
      }
    }

    this.bindEvents()
    this.render()

    if (this.activeRun) {
      this.startPolling()
    }
  }

  bindEvents() {
    const startBtn = document.getElementById('start-analysis-btn')
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startAnalysis())
    }

    const cancelBtn = document.getElementById('cancel-analysis-btn')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelAnalysis())
    }

    const switchBtn = document.getElementById('switch-policy-btn')
    if (switchBtn) {
      switchBtn.addEventListener('click', () => this.switchPolicy())
    }
  }

  // ── Polling ───────────────────────────────────────────

  startPolling() {
    if (this.polling) return
    this.polling = true
    this.consecutiveFailures = 0
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS)
  }

  stopPolling() {
    this.polling = false
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  async poll() {
    if (this.fetchInFlight) return
    this.fetchInFlight = true

    try {
      // When we already know the active run ID, fetch the full detail DTO
      // (includes live stats, phases, timings). Fall back to the list
      // endpoint only when discovering whether a run exists.
      const activeId = this.activeRun?.id
      const runFetchUrl = activeId
        ? `/cleanse/api/run/${encodeURIComponent(activeId)}`
        : '/cleanse/api/runs?skip=0&top=1'

      const [runRes, policiesRes] = await Promise.all([
        fetch(runFetchUrl),
        fetch('/cleanse/api/policies')
      ])

      if (runRes.ok) {
        const data = await runRes.json()
        const latestRun = activeId ? data : ((data.runs ?? [])[0] ?? null)

        if (
          latestRun &&
          (latestRun.status === 'Running' || latestRun.status === 'Cancelling')
        ) {
          this.activeRun = latestRun
        } else {
          // Operation has transitioned to a terminal state
          if (this.activeRun) {
            const newStatus = latestRun?.status
            this.activeRun = null
            this.stopPolling()
            this.showCompletionNotification(newStatus, latestRun)
            // Refresh the history table by reloading the page
            setTimeout(() => window.location.reload(), 1500)
            return
          }
        }

        this.consecutiveFailures = 0
      } else {
        this.consecutiveFailures++
      }

      if (policiesRes.ok) {
        const policiesData = await policiesRes.json()
        if (Array.isArray(policiesData)) {
          this.policies = policiesData
        }
      }

      if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        show('connection-warning')
      } else {
        hide('connection-warning')
      }

      this.render()
    } catch {
      this.consecutiveFailures++
      if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        show('connection-warning')
      }
    } finally {
      this.fetchInFlight = false
    }
  }

  // ── Actions ───────────────────────────────────────────

  async startAnalysis() {
    const startBtn = document.getElementById('start-analysis-btn')
    if (startBtn) startBtn.disabled = true

    try {
      const res = await fetch('/cleanse/api/start', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (res.status === 202 || res.ok) {
        // Seed activeRun with the operation ID so the first poll
        // hits the detail endpoint instead of the list endpoint
        const operationId = data.operationId ?? null
        if (operationId) {
          this.activeRun = { id: operationId, status: 'Running' }
        }
        this.showNotification(
          'Analysis started. Operation ID: ' + (operationId ?? 'unknown'),
          'success'
        )
        this.startPolling()
        await this.poll()
      } else if (res.status === 409) {
        this.showNotification('An analysis is already running.', 'important')
      } else {
        this.showNotification(
          data.message ?? 'Failed to start analysis',
          'error'
        )
      }
    } catch {
      this.showNotification('Network error. Please try again.', 'error')
    } finally {
      if (startBtn) startBtn.disabled = false
    }
  }

  async cancelAnalysis() {
    if (
      !window.confirm('Are you sure you want to cancel the running analysis?')
    ) {
      return
    }

    try {
      const res = await fetch('/cleanse/api/cancel', { method: 'POST' })

      if (res.ok) {
        // Optimistic UI update
        if (this.activeRun) {
          this.activeRun.status = 'Cancelling'
        }
        this.render()
      } else if (res.status === 404) {
        // Operation already completed
        await this.poll()
      } else {
        const data = await res.json().catch(() => ({}))
        this.showNotification(
          data.message ?? 'Failed to cancel analysis',
          'error'
        )
      }
    } catch {
      this.showNotification('Network error. Please try again.', 'error')
    }
  }

  async switchPolicy() {
    const select = document.getElementById('policy-select')
    if (!select) return

    const slug = select.value
    if (!slug) return

    const switchBtn = document.getElementById('switch-policy-btn')
    if (switchBtn) switchBtn.disabled = true

    try {
      const res = await fetch(
        `/cleanse/api/policies/${encodeURIComponent(slug)}/activate`,
        { method: 'POST' }
      )

      if (res.ok) {
        this.policies.forEach((p) => {
          p.isActive = p.slug === slug
        })
        this.render()
      } else if (res.status === 404) {
        this.showInlineError('policy-error', 'Policy not found.')
      } else {
        const data = await res.json().catch(() => ({}))
        this.showInlineError(
          'policy-error',
          data.message ?? 'Failed to switch policy.'
        )
      }
    } catch {
      this.showInlineError('policy-error', 'Network error. Please try again.')
    } finally {
      if (switchBtn) switchBtn.disabled = false
    }
  }

  // ── Rendering ─────────────────────────────────────────

  render() {
    this.renderActiveWidget()
    this.renderPolicySwitcher()
  }

  renderActiveWidget() {
    const run = this.activeRun
    const statusTag = document.getElementById('widget-status-tag')

    if (run) {
      hide('idle-message')
      show('metrics-grid')
      show('progress-section')

      // Status tag
      if (statusTag) {
        statusTag.textContent =
          run.status === 'Cancelling' ? 'Cancelling…' : run.status
        statusTag.className = `govuk-tag ${
          run.status === 'Running' ? 'govuk-tag--blue' : 'govuk-tag--yellow'
        }`
      }

      // Real-time metrics
      const stats = run.stats
      setText(
        'metric-current-rpm',
        stats?.currentRpm != null
          ? formatNumber(stats.currentRpm) + ' records/min'
          : 'Calculating…'
      )
      setText(
        'metric-average-rpm',
        stats?.averageRpm != null
          ? formatNumber(stats.averageRpm) + ' records/min'
          : 'Calculating…'
      )
      setText(
        'metric-time-remaining',
        stats?.estimatedDurationRemainingSeconds != null
          ? formatDurationSeconds(stats.estimatedDurationRemainingSeconds)
          : 'Calculating…'
      )
      setText(
        'metric-est-complete',
        stats?.projectedEndUtc
          ? formatDate(stats.projectedEndUtc)
          : 'Calculating…'
      )
      setText('metric-issues-found', formatNumber(run.issuesFound))
      setText('metric-issues-resolved', formatNumber(run.issuesResolved))

      // Progress
      setText(
        'progress-text',
        `${formatNumber(run.recordsAnalyzed)} of ${formatNumber(run.totalRecords)}`
      )
      const pct = run.progressPercentage ?? 0
      const progressBar = document.getElementById('progress-bar')
      if (progressBar) {
        progressBar.style.width = pct + '%'
      }
      const progressContainer = progressBar?.parentElement
      if (progressContainer) {
        progressContainer.setAttribute('aria-valuenow', String(Math.round(pct)))
      }
      setText('progress-percentage', pct.toFixed(1) + '%')
      setText('widget-started', formatDate(run.startedAtUtc))

      // Buttons
      hide('start-analysis-btn')
      if (run.status === 'Running') {
        show('cancel-analysis-btn')
        hide('cancelling-message')
      } else {
        hide('cancel-analysis-btn')
        show('cancelling-message')
      }

      // Report link
      const reportLink = document.getElementById('view-report-link')
      if (reportLink) {
        reportLink.href = `/cleanse/run/${encodeURIComponent(run.id)}/report`
        show('view-report-link')
      }
    } else {
      // Idle state
      show('idle-message')
      hide('metrics-grid')
      hide('progress-section')
      show('start-analysis-btn')
      hide('cancel-analysis-btn')
      hide('cancelling-message')

      if (statusTag) {
        statusTag.textContent = 'Idle'
        statusTag.className = 'govuk-tag govuk-tag--grey'
      }

      hide('view-report-link')
    }
  }

  renderPolicySwitcher() {
    const select = document.getElementById('policy-select')
    if (!select) return

    const activePolicy = this.policies.find((p) => p.isActive)
    const activeSlug = activePolicy?.slug ?? ''

    // Update active policy name tag
    setText('active-policy-name', activePolicy?.name ?? 'Normal (Fallback)')

    // Update select options
    select.innerHTML = ''
    for (const policy of this.policies) {
      const option = document.createElement('option')
      option.value = policy.slug
      option.textContent = policy.name
      if (policy.slug === activeSlug) {
        option.selected = true
      }
      select.appendChild(option)
    }

    // Update policy metadata
    const settings = activePolicy?.settings?.cleanseAnalysis
    if (settings) {
      setText('policy-batch-size', settings.pumpBatchSize + ' records')
      setText('policy-pump-delay', settings.pumpDelayMs + 'ms')
      setText(
        'policy-progress-interval',
        'every ' + settings.progressUpdateInterval + ' records'
      )
    } else {
      setText('policy-batch-size', '— records')
      setText('policy-pump-delay', '—ms')
      setText('policy-progress-interval', 'every — records')
    }
  }

  // ── Notifications ─────────────────────────────────────

  showNotification(message, type = 'success') {
    const container = document.getElementById('notification-area')
    if (!container) return

    const isSuccess = type === 'success'
    const titleText = isSuccess
      ? 'Success'
      : type === 'error'
        ? 'There is a problem'
        : 'Important'

    const bannerClass = isSuccess ? 'govuk-notification-banner--success' : ''

    container.innerHTML = `
      <div class="govuk-notification-banner ${bannerClass}"
           role="alert" aria-live="polite"
           data-module="govuk-notification-banner">
        <div class="govuk-notification-banner__header">
          <h2 class="govuk-notification-banner__title">
            ${escapeHtml(titleText)}
          </h2>
        </div>
        <div class="govuk-notification-banner__content">
          <p class="govuk-notification-banner__heading">
            ${escapeHtml(message)}
          </p>
        </div>
      </div>
    `

    setTimeout(() => {
      container.innerHTML = ''
    }, 8000)
  }

  showCompletionNotification(status, run) {
    const messages = {
      Completed: 'Analysis completed successfully.',
      Cancelled: 'Analysis was cancelled.',
      Failed: 'Analysis failed' + (run?.error ? ': ' + run.error : '.')
    }
    const type =
      status === 'Completed'
        ? 'success'
        : status === 'Failed'
          ? 'error'
          : 'important'
    this.showNotification(messages[status] ?? 'Analysis finished.', type)
  }

  showInlineError(id, message) {
    const el = document.getElementById(id)
    if (!el) return
    el.textContent = message
    el.style.display = ''
    setTimeout(() => {
      el.style.display = 'none'
    }, 5000)
  }
}

// ─── Bootstrap ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('cleanse-dashboard')
  if (container) {
    const _dashboard = new CleanseDashboard()
    _dashboard.toString() // keep reference
  }
})

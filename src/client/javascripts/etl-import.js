/**
 * ETL import detail — polls the run's status while it is in flight.
 *
 * Stage progress is updated in place; once the run reaches a terminal status the page is reloaded
 * once, so the completed run is rendered by the same server-side template as a direct visit rather
 * than by a second copy of it here.
 */

const POLL_INTERVAL_MS = 2000
const MAX_CONSECUTIVE_FAILURES = 5

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})

const TAG_CLASSES = [
  'govuk-tag--green',
  'govuk-tag--red',
  'govuk-tag--orange',
  'govuk-tag--blue',
  'govuk-tag--yellow',
  'govuk-tag--grey'
]

function tagClass(status) {
  switch (status) {
    case 'Succeeded':
      return 'govuk-tag--green'
    case 'Failed':
      return 'govuk-tag--red'
    case 'Rejected':
      return 'govuk-tag--orange'
    case 'Running':
      return 'govuk-tag--blue'
    case 'Queued':
      return 'govuk-tag--yellow'
    default:
      return 'govuk-tag--grey'
  }
}

function formatDuration(ms) {
  if (ms == null) return '—'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  return `${m}m ${totalSec % 60}s`
}

function formatTime(iso) {
  return iso ? TIME_FORMAT.format(new Date(iso)) : '—'
}

class EtlImportPoller {
  constructor(root, initial) {
    this.importId = root.dataset.importId
    this.consecutiveFailures = 0
    this.fetchInFlight = false
    this.timer = null

    if (initial && !initial.isTerminal) {
      this.start()
    }
  }

  start() {
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async poll() {
    if (this.fetchInFlight) return
    this.fetchInFlight = true

    try {
      const response = await fetch(
        `/etl/api/imports/${encodeURIComponent(this.importId)}`
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const etlImport = await response.json()

      this.consecutiveFailures = 0
      this.render(etlImport)

      if (etlImport.isTerminal) {
        this.stop()
        // The completed run has per-dataset detail this page does not render client-side.
        window.location.reload()
      }
    } catch {
      this.consecutiveFailures += 1
      if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) this.stop()
    } finally {
      this.fetchInFlight = false
    }
  }

  render(etlImport) {
    const tag = document.getElementById('etl-status-tag')
    if (tag) {
      tag.textContent = etlImport.status
      tag.classList.remove(...TAG_CLASSES)
      tag.classList.add(tagClass(etlImport.status))
    }

    const stage = document.getElementById('etl-current-stage')
    if (stage) {
      stage.textContent = etlImport.currentStage
        ? `Stage: ${etlImport.currentStage}`
        : ''
    }

    this.renderStages(etlImport.stages ?? [])
  }

  renderStages(stages) {
    const body = document.getElementById('etl-stages')?.querySelector('tbody')

    if (!body || !stages.length) return

    body.replaceChildren(
      ...stages.map((stage) => {
        const row = document.createElement('tr')
        row.className = 'govuk-table__row'

        for (const [text, numeric] of [
          [stage.name, false],
          [String(stage.itemCount), true],
          [formatDuration(stage.elapsedMs), true],
          [formatTime(stage.completedAtUtc), false]
        ]) {
          const cell = document.createElement('td')
          cell.className = numeric
            ? 'govuk-table__cell govuk-table__cell--numeric'
            : 'govuk-table__cell'
          cell.textContent = text
          row.append(cell)
        }

        return row
      })
    )
  }
}

const root = document.getElementById('etl-import')

if (root) {
  let initial = null
  const dataEl = document.getElementById('etl-initial-data')

  if (dataEl) {
    try {
      initial = JSON.parse(dataEl.textContent).etlImport
    } catch {
      // Proceed without initial state; the first poll will populate the page.
    }
  }

  const poller = new EtlImportPoller(root, initial)

  window.addEventListener('beforeunload', () => poller.stop())
}

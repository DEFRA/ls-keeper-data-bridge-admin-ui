import { flattenOperationTree } from './controller.js'

// ── Example API response from /api/cleanse/run/:id ──────────

const exampleRunResponse = {
  id: '619cb534-d3f3-4428-bb36-a34207870820',
  status: 'Running',
  startedAtUtc: '2026-03-27T12:38:30.05Z',
  completedAtUtc: null,
  progressPercentage: 0,
  statusDescription: 'Initializing analysis...',
  recordsAnalyzed: 0,
  totalRecords: 0,
  issuesFound: 0,
  issuesResolved: 0,
  error: null,
  durationMs: null,
  reportObjectKey: null,
  reportUrl: null,
  progress: {
    name: 'total',
    status: 'in-progress',
    percentComplete: 97.01,
    processedCount: 809442,
    totalRecords: 834355,
    elapsedMs: 3352003,
    elapsed: '00:55:52.0',
    currentRecordsPerMinute: 34638.9,
    averageRecordsPerMinute: 7662.93,
    children: [
      {
        name: 'Analysis',
        status: 'in-progress',
        description: 'Loading reference data...',
        percentComplete: 97.01,
        processedCount: 809442,
        totalRecords: 834355,
        elapsedMs: 3351995,
        elapsed: '00:55:51.9',
        currentRecordsPerMinute: 34638.9,
        averageRecordsPerMinute: 7662.93,
        children: [
          {
            name: 'Preload',
            status: 'in-progress',
            description: 'Loading 997,157 records from 6 collections',
            percentComplete: 97.01,
            processedCount: 809442,
            totalRecords: 834355,
            elapsedMs: 3351631,
            elapsed: '00:55:51.6',
            currentRecordsPerMinute: 34638.9,
            averageRecordsPerMinute: 7662.93,
            children: [
              {
                name: 'counting',
                status: 'completed',
                percentComplete: 100,
                elapsedMs: 355,
                elapsed: '00:00:00.3'
              },
              {
                name: 'cts_cph_holding',
                status: 'completed',
                description: 'Loading cts_cph_holding',
                percentComplete: 100,
                processedCount: 262727,
                totalRecords: 262727,
                elapsedMs: 2404958,
                elapsed: '00:40:04.9',
                currentRecordsPerMinute: 5782.79,
                children: [
                  {
                    name: 'fetching',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 825216,
                    elapsed: '00:13:45.2'
                  },
                  {
                    name: 'throttle_wait',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 1574058,
                    elapsed: '00:26:14.0'
                  }
                ]
              },
              {
                name: 'cts_keeper',
                status: 'completed',
                description: 'Loading cts_keeper',
                percentComplete: 100,
                processedCount: 119757,
                totalRecords: 119757,
                elapsedMs: 895718,
                elapsed: '00:14:55.7',
                currentRecordsPerMinute: 7431.98,
                children: [
                  {
                    name: 'fetching',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 176845,
                    elapsed: '00:02:56.8'
                  },
                  {
                    name: 'throttle_wait',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 716370,
                    elapsed: '00:11:56.3'
                  }
                ]
              },
              {
                name: 'sam_cph_holdings',
                status: 'completed',
                description: 'Loading sam_cph_holdings',
                percentComplete: 100,
                processedCount: 118783,
                totalRecords: 118783,
                elapsedMs: 888547,
                elapsed: '00:14:48.5',
                currentRecordsPerMinute: 7517.02,
                children: [
                  {
                    name: 'fetching',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 175293,
                    elapsed: '00:02:55.2'
                  },
                  {
                    name: 'throttle_wait',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 710792,
                    elapsed: '00:11:50.7'
                  }
                ]
              },
              {
                name: 'sam_herd',
                status: 'completed',
                description: 'Loading sam_herd',
                percentComplete: 100,
                processedCount: 173975,
                totalRecords: 173975,
                elapsedMs: 1412296,
                elapsed: '00:23:32.2',
                currentRecordsPerMinute: 6770.39,
                children: [
                  {
                    name: 'fetching',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 366972,
                    elapsed: '00:06:06.9'
                  },
                  {
                    name: 'throttle_wait',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 1041654,
                    elapsed: '00:17:21.6'
                  }
                ]
              },
              {
                name: 'sam_party',
                status: 'in-progress',
                description: 'Loading sam_party',
                percentComplete: 84.34,
                processedCount: 134200,
                totalRecords: 159113,
                elapsedMs: 1050773,
                elapsed: '00:17:30.7',
                projectedRemainingMs: 209449,
                projectedEndTimeUtc: '2026-03-27T13:37:51.538Z',
                currentRecordsPerMinute: 7136.72,
                averageRecordsPerMinute: 7662.93,
                children: [
                  {
                    name: 'fetching',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 244969,
                    elapsed: '00:04:04.9'
                  },
                  {
                    name: 'throttle_wait',
                    status: 'completed',
                    percentComplete: 100,
                    elapsedMs: 802971,
                    elapsed: '00:13:22.9'
                  }
                ]
              },
              {
                name: 'sam_cph_holder',
                status: 'not-started',
                elapsedMs: 0,
                elapsed: '00:00:00.0'
              }
            ]
          }
        ]
      }
    ]
  }
}

// ── flattenOperationTree tests ──────────────────────────────

describe('#flattenOperationTree', () => {
  test('Should return empty array for null input', () => {
    expect(flattenOperationTree(null)).toEqual([])
  })

  test('Should return empty array for undefined input', () => {
    expect(flattenOperationTree(undefined)).toEqual([])
  })

  test('Should return empty array for non-object input', () => {
    expect(flattenOperationTree('not-an-object')).toEqual([])
  })

  test('Should flatten a single leaf node', () => {
    const leaf = {
      name: 'counting',
      status: 'completed',
      percentComplete: 100,
      elapsedMs: 355,
      elapsed: '00:00:00.3'
    }

    const result = flattenOperationTree(leaf)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: 'counting',
      status: 'completed',
      description: null,
      percentComplete: 100,
      processedCount: null,
      totalRecords: null,
      elapsed: '00:00:00.3',
      elapsedMs: 355,
      currentRpm: null,
      averageRpm: null,
      projectedEnd: null,
      projectedRemainingMs: null,
      depth: 0,
      hasChildren: false
    })
  })

  test('Should flatten the full example OperationNode tree', () => {
    const result = flattenOperationTree(exampleRunResponse.progress)

    // Count expected nodes: total(1) + Analysis(1) + Preload(1)
    //   + counting(1) + cts_cph_holding(1) + fetching + throttle_wait(2)
    //   + cts_keeper(1) + fetching + throttle_wait(2)
    //   + sam_cph_holdings(1) + fetching + throttle_wait(2)
    //   + sam_herd(1) + fetching + throttle_wait(2)
    //   + sam_party(1) + fetching + throttle_wait(2)
    //   + sam_cph_holder(1) = 20
    expect(result).toHaveLength(20)
  })

  test('Should assign correct depth to each level', () => {
    const result = flattenOperationTree(exampleRunResponse.progress)

    // Root "total" = depth 0
    expect(result[0].name).toBe('total')
    expect(result[0].depth).toBe(0)

    // "Analysis" = depth 1
    expect(result[1].name).toBe('Analysis')
    expect(result[1].depth).toBe(1)

    // "Preload" = depth 2
    expect(result[2].name).toBe('Preload')
    expect(result[2].depth).toBe(2)

    // "counting" = depth 3
    expect(result[3].name).toBe('counting')
    expect(result[3].depth).toBe(3)

    // "fetching" under cts_cph_holding = depth 4
    const ctsFetching = result.find(
      (n) => n.name === 'fetching' && n.depth === 4
    )
    expect(ctsFetching).toBeDefined()
    expect(ctsFetching.depth).toBe(4)
  })

  test('Should map OperationNode fields correctly', () => {
    const result = flattenOperationTree(exampleRunResponse.progress)
    const root = result[0]

    expect(root.name).toBe('total')
    expect(root.status).toBe('in-progress')
    expect(root.percentComplete).toBe(97.01)
    expect(root.processedCount).toBe(809442)
    expect(root.totalRecords).toBe(834355)
    expect(root.elapsedMs).toBe(3352003)
    expect(root.elapsed).toBe('00:55:52.0')
    expect(root.currentRpm).toBe(34638.9)
    expect(root.averageRpm).toBe(7662.93)
    expect(root.description).toBeNull()
    expect(root.projectedEnd).toBeNull()
    expect(root.projectedRemainingMs).toBeNull()
    expect(root.hasChildren).toBe(true)
  })

  test('Should handle nodes with description', () => {
    const result = flattenOperationTree(exampleRunResponse.progress)
    const analysis = result[1]

    expect(analysis.name).toBe('Analysis')
    expect(analysis.description).toBe('Loading reference data...')
  })

  test('Should handle nodes without optional fields', () => {
    const result = flattenOperationTree(exampleRunResponse.progress)
    const counting = result[3]

    expect(counting.name).toBe('counting')
    expect(counting.description).toBeNull()
    expect(counting.processedCount).toBeNull()
    expect(counting.totalRecords).toBeNull()
    expect(counting.currentRpm).toBeNull()
    expect(counting.averageRpm).toBeNull()
    expect(counting.hasChildren).toBe(false)
  })

  test('Should include projected fields when present', () => {
    const result = flattenOperationTree(exampleRunResponse.progress)
    const samParty = result.find((n) => n.name === 'sam_party')

    expect(samParty).toBeDefined()
    expect(samParty.projectedEnd).toBe('2026-03-27T13:37:51.538Z')
    expect(samParty.projectedRemainingMs).toBe(209449)
    expect(samParty.currentRpm).toBe(7136.72)
    expect(samParty.averageRpm).toBe(7662.93)
  })

  test('Should default name to (unnamed) when missing', () => {
    const result = flattenOperationTree({ elapsedMs: 100, elapsed: '0:00' })

    expect(result[0].name).toBe('(unnamed)')
    expect(result[0].hasChildren).toBe(false)
  })

  test('Should default elapsed to — when missing', () => {
    const result = flattenOperationTree({ name: 'test' })

    expect(result[0].elapsed).toBe('—')
    expect(result[0].elapsedMs).toBe(0)
    expect(result[0].projectedEnd).toBeNull()
    expect(result[0].projectedRemainingMs).toBeNull()
    expect(result[0].hasChildren).toBe(false)
  })

  test('Should preserve tree order (pre-order traversal)', () => {
    const result = flattenOperationTree(exampleRunResponse.progress)
    const names = result.map((n) => n.name)

    expect(names).toEqual([
      'total',
      'Analysis',
      'Preload',
      'counting',
      'cts_cph_holding',
      'fetching',
      'throttle_wait',
      'cts_keeper',
      'fetching',
      'throttle_wait',
      'sam_cph_holdings',
      'fetching',
      'throttle_wait',
      'sam_herd',
      'fetching',
      'throttle_wait',
      'sam_party',
      'fetching',
      'throttle_wait',
      'sam_cph_holder'
    ])
  })

  test('Should set hasChildren correctly for parent and leaf nodes', () => {
    const result = flattenOperationTree(exampleRunResponse.progress)

    // Parents
    expect(result.find((n) => n.name === 'total').hasChildren).toBe(true)
    expect(result.find((n) => n.name === 'Analysis').hasChildren).toBe(true)
    expect(result.find((n) => n.name === 'Preload').hasChildren).toBe(true)
    expect(result.find((n) => n.name === 'cts_cph_holding').hasChildren).toBe(
      true
    )

    // Leaves
    expect(result.find((n) => n.name === 'counting').hasChildren).toBe(false)
    expect(result.find((n) => n.name === 'sam_cph_holder').hasChildren).toBe(
      false
    )
    const fetching = result.filter((n) => n.name === 'fetching')
    fetching.forEach((f) => expect(f.hasChildren).toBe(false))
  })
})

// ── currentPhase derivation tests ───────────────────────────

describe('#currentPhase derivation', () => {
  // Mirrors the logic in cleanseRunReportController
  function deriveCurrentPhase(progress) {
    return (
      progress?.children?.find((c) => c.status === 'in-progress')?.name ?? null
    )
  }

  test('Should find the in-progress phase', () => {
    const phase = deriveCurrentPhase(exampleRunResponse.progress)
    expect(phase).toBe('Analysis')
  })

  test('Should return null when progress is null', () => {
    expect(deriveCurrentPhase(null)).toBeNull()
  })

  test('Should return null when no children are in-progress', () => {
    const completed = {
      name: 'total',
      status: 'completed',
      children: [
        { name: 'Analysis', status: 'completed' },
        { name: 'Export', status: 'completed' }
      ]
    }
    expect(deriveCurrentPhase(completed)).toBeNull()
  })

  test('Should return the first in-progress child', () => {
    const multi = {
      name: 'total',
      status: 'in-progress',
      children: [
        { name: 'Analysis', status: 'completed' },
        { name: 'Deactivation', status: 'in-progress' },
        { name: 'Export', status: 'not-started' }
      ]
    }
    expect(deriveCurrentPhase(multi)).toBe('Deactivation')
  })
})

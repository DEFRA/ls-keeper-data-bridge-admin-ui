import { transformHealthResults } from './controller.js'

const exampleHealthResponse = {
  quartz_jobs: {
    status: 'Healthy',
    description: 'Quartz scheduled jobs',
    data: {
      ImportBulkFilesJob: {
        IsEnabled: true,
        CronSchedule: '0 0 8 * * ?'
      },
      CleanseReportJob: {
        IsEnabled: false,
        CronSchedule: '0 0 2 * * ?'
      }
    }
  },
  mongodb: {
    status: 'Healthy',
    description: 'MongoDB is reachable',
    data: {}
  },
  aws_sns: {
    status: 'Healthy',
    description: "SNS topic 'ls_keeper_data_bridge_events' is reachable.",
    data: {
      TopicArn:
        'arn:aws:sns:eu-west-2:120185944470:ls_keeper_data_bridge_events'
    }
  },
  aws_s3: {
    status: 'Healthy',
    description: 'All S3 buckets are reachable',
    data: {
      ExternalStorageClient: {
        Bucket: 'cerespfm-prp-prp1-livestockfeeds',
        Status: 'Healthy'
      },
      InternalStorageClient: {
        Bucket: 'perf-test-ls-keeper-data-bridge-import-05244',
        Status: 'Healthy'
      }
    }
  },
  internal_storage: {
    status: 'Healthy',
    description: 'Internal storage provider: S3',
    data: {
      Provider: 'S3',
      Bucket: 'perf-test-ls-keeper-data-bridge-import-05244'
    }
  },
  'govuk-notify': {
    status: 'Healthy',
    description: 'Connected successfully (1 templates available)',
    data: {
      TemplateId: '228237fc-a48b-4fda-8a88-34b724dfe3e7',
      ApiKeyHash: 'bedc585eb5afd307',
      RecipientEmails: ['kri***'],
      Enabled: true,
      TemplateCount: 1,
      ConfiguredTemplateExists: true
    }
  }
}

describe('#transformHealthResults', () => {
  test('Should return empty array for null', () => {
    expect(transformHealthResults(null)).toEqual([])
  })

  test('Should return empty array for undefined', () => {
    expect(transformHealthResults(undefined)).toEqual([])
  })

  test('Should return empty array for non-object', () => {
    expect(transformHealthResults('not-an-object')).toEqual([])
  })

  test('Should transform all checks from example response', () => {
    const result = transformHealthResults(exampleHealthResponse)

    expect(result).toHaveLength(6)
    expect(result.map((r) => r.key)).toEqual([
      'quartz_jobs',
      'mongodb',
      'aws_sns',
      'aws_s3',
      'internal_storage',
      'govuk-notify'
    ])
  })

  test('Should format check names from keys', () => {
    const result = transformHealthResults(exampleHealthResponse)

    expect(result[0].name).toBe('Quartz Jobs')
    expect(result[2].name).toBe('Aws Sns')
    expect(result[3].name).toBe('Aws S3')
    expect(result[5].name).toBe('Govuk Notify')
  })

  test('Should extract status and description', () => {
    const result = transformHealthResults(exampleHealthResponse)

    expect(result[0].status).toBe('Healthy')
    expect(result[0].description).toBe('Quartz scheduled jobs')
    expect(result[1].description).toBe('MongoDB is reachable')
  })

  test('Should flatten nested data objects', () => {
    const result = transformHealthResults(exampleHealthResponse)
    const quartzJobs = result[0]

    expect(quartzJobs.data).toEqual([
      { key: 'ImportBulkFilesJob.IsEnabled', value: 'true' },
      { key: 'ImportBulkFilesJob.CronSchedule', value: '0 0 8 * * ?' },
      { key: 'CleanseReportJob.IsEnabled', value: 'false' },
      { key: 'CleanseReportJob.CronSchedule', value: '0 0 2 * * ?' }
    ])
  })

  test('Should handle scalar data values', () => {
    const result = transformHealthResults(exampleHealthResponse)
    const snsTopic = result[2]

    expect(snsTopic.data).toEqual([
      {
        key: 'TopicArn',
        value: 'arn:aws:sns:eu-west-2:120185944470:ls_keeper_data_bridge_events'
      }
    ])
  })

  test('Should handle array data values', () => {
    const result = transformHealthResults(exampleHealthResponse)
    const govukNotify = result[5]
    const recipientEntry = govukNotify.data.find(
      (d) => d.key === 'RecipientEmails'
    )

    expect(recipientEntry).toBeDefined()
    expect(recipientEntry.value).toBe('kri***')
  })

  test('Should handle empty data object', () => {
    const result = transformHealthResults(exampleHealthResponse)
    const mongodb = result[1]

    expect(mongodb.data).toEqual([])
  })

  test('Should flatten S3 nested bucket objects', () => {
    const result = transformHealthResults(exampleHealthResponse)
    const s3 = result[3]

    expect(s3.data).toEqual([
      {
        key: 'ExternalStorageClient.Bucket',
        value: 'cerespfm-prp-prp1-livestockfeeds'
      },
      { key: 'ExternalStorageClient.Status', value: 'Healthy' },
      {
        key: 'InternalStorageClient.Bucket',
        value: 'perf-test-ls-keeper-data-bridge-import-05244'
      },
      { key: 'InternalStorageClient.Status', value: 'Healthy' }
    ])
  })

  test('Should default status to Unknown when missing', () => {
    const result = transformHealthResults({
      test_check: { description: 'A test' }
    })

    expect(result[0].status).toBe('Unknown')
  })

  test('Should default description to null when missing', () => {
    const result = transformHealthResults({
      test_check: { status: 'Healthy' }
    })

    expect(result[0].description).toBeNull()
  })
})

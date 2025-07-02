// Import types first
import type { FlatfileEvent } from '@flatfile/listener';

// Setup mocks before any imports that use them
let handlerCallback: Function;
jest.mock('@flatfile/plugin-job-handler', () => ({
  jobHandler: (_pattern: string, callback: Function) => {
    handlerCallback = callback;
    return callback;
  }
}));

jest.mock('@flatfile/api', () => ({
  __esModule: true,
  Flatfile: {
    ActionMode: {
      Foreground: 'foreground',
      Background: 'background'
    }
  },
  default: {
    jobs: {
      ack: jest.fn(),
      complete: jest.fn(),
      fail: jest.fn()
    },
    sheets: {
      list: jest.fn()
    },
    records: {
      get: jest.fn()
    }
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Import dependencies after mocks are setup
import api from '@flatfile/api';
import { submitBlueprint } from '../../blueprints/actions/submit.action';
import { submitListener } from '../../listeners/submit.listener';


submitListener;

describe('submit listener callback', () => {
  const mockEvent = {
    topic: `job:${submitBlueprint.operation}`,
    context: {
      jobId: 'test-job-id',
      workbookId: 'test-workbook-id'
    },
    payload: {
      data: 'test-data'
    }
  } as FlatfileEvent;

  const mockTick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEBHOOK_SITE_URL = 'https://test-webhook.site';
  });

  it('should successfully process and submit data', async () => {
    // Mock API responses
    (api.sheets.list as jest.Mock).mockResolvedValue({
      data: [{ id: 'sheet-1' }]
    });
    (api.records.get as jest.Mock).mockResolvedValue({
      records: [{ data: 'test-record' }]
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200
    });

    await handlerCallback(mockEvent, mockTick);

    // Verify job acknowledgment
    expect(api.jobs.ack).toHaveBeenCalledWith('test-job-id', {
      info: 'Starting job to submit action to webhook.site',
      progress: 10
    });

    // Verify data fetching
    expect(api.sheets.list).toHaveBeenCalledWith({
      workbookId: 'test-workbook-id'
    });
    expect(api.records.get).toHaveBeenCalledWith('sheet-1');

    // Verify webhook call
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-webhook.site',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );

    // Verify job completion
    expect(api.jobs.complete).toHaveBeenCalledWith('test-job-id', {
      outcome: {
        message: 'Data was successfully submitted to Webhook.site. Go check it out at https://test-webhook.site.'
      }
    });
  });

  it('should handle webhook submission failure', async () => {
    // Mock API responses
    (api.sheets.list as jest.Mock).mockResolvedValue({
      data: [{ id: 'sheet-1' }]
    });
    (api.records.get as jest.Mock).mockResolvedValue({
      records: [{ data: 'test-record' }]
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 500
    });

    await handlerCallback(mockEvent, mockTick);

    // Verify job failure
    expect(api.jobs.fail).toHaveBeenCalledWith('test-job-id', {
      outcome: {
        message: 'This job failed. Check your https://test-webhook.site.'
      }
    });
  });

  it('should handle API errors', async () => {
    // Mock API error
    (api.sheets.list as jest.Mock).mockRejectedValue(new Error('API Error'));

    await handlerCallback(mockEvent, mockTick);

    // Verify job failure
    expect(api.jobs.fail).toHaveBeenCalledWith('test-job-id', {
      outcome: {
        message: 'This job failed. Check your https://test-webhook.site.'
      }
    });
  });
}); 
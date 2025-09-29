const { detectPlatform, isCloudflareWorker, isVercelEdge } = require('../src/core/platform');

describe('Platform Detection', () => {
  it('should detect generic platform by default', () => {
    expect(detectPlatform()).toBe('generic');
  });

  it('should return false for specific platforms in generic env', () => {
    expect(isCloudflareWorker()).toBe(false);
    expect(isVercelEdge()).toBe(false);
  });
});
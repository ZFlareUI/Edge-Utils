const { minimizeColdStart, keepAlive } = require('../src/performance/cold-start');

describe('Cold Start', () => {
  it('should call init only once', () => {
    const init = jest.fn();
    minimizeColdStart(init);
    minimizeColdStart(init);
    expect(init).toHaveBeenCalledTimes(1);
  });
});
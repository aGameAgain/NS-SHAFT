// Mock DOM globals for testing
global.HTMLCanvasElement = class {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.clientWidth = 800;
    this.clientHeight = 600;
  }
  
  getContext() {
    return {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      canvas: { width: 800, height: 600 }
    };
  }
};

global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
});

global.cancelAnimationFrame = vi.fn();
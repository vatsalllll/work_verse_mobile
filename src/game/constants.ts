// Game constants and configuration

export const SCREEN = {
  WIDTH: 400,
  HEIGHT: 600,
};

export const PLAYER = {
  SIZE: 48,
  SPEED: 3,
  INITIAL_X: SCREEN.WIDTH / 2,
  INITIAL_Y: SCREEN.HEIGHT / 2,
};

export const PHILOSOPHER = {
  SIZE: 48,
  ROAM_SPEED: 1,
  INTERACTION_DISTANCE: 60,
};

export const WORLD = {
  WIDTH: 800,
  HEIGHT: 1200,
  TILE_SIZE: 32,
};

export const COLORS = {
  PRIMARY: '#5B4FCF',
  SECONDARY: '#87CEEB',
  BACKGROUND: '#1a1a2e',
  SURFACE: '#16213e',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  ACCENT: '#e94560',
  SUCCESS: '#00d4aa',
  DIALOGUE_BG: 'rgba(22, 33, 62, 0.95)',
};

export const PHILOSOPHERS_CONFIG = [
  { id: 'socrates', name: 'Socrates', x: 100, y: 150, color: '#FFD700' },
  { id: 'aristotle', name: 'Aristotle', x: 300, y: 100, color: '#C0C0C0' },
  { id: 'plato', name: 'Plato', x: 200, y: 300, color: '#CD7F32' },
  { id: 'descartes', name: 'Descartes', x: 80, y: 400, color: '#4169E1' },
  { id: 'leibniz', name: 'Leibniz', x: 320, y: 350, color: '#9932CC' },
  { id: 'ada_lovelace', name: 'Ada Lovelace', x: 180, y: 480, color: '#FF69B4' },
  { id: 'turing', name: 'Turing', x: 50, y: 250, color: '#00CED1' },
  { id: 'searle', name: 'Searle', x: 350, y: 220, color: '#FF6347' },
  { id: 'chomsky', name: 'Chomsky', x: 250, y: 180, color: '#32CD32' },
  { id: 'dennett', name: 'Dennett', x: 150, y: 380, color: '#FF8C00' },
];

export const API = {
  WS_URL: 'ws://localhost:8000/ws/chat',
  HTTP_URL: 'http://localhost:8000',
};

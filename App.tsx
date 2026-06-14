// PhiloAgents Mobile - Main App with exact UI matching the web version

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, PinchGestureHandler, PanGestureHandlerGestureEvent, PinchGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import SpriteRenderer, { getWalkFrames, getIdleFrame } from './src/components/SpriteRenderer';
import { isWalkable, resolveMovement } from './src/data/collisionGrid';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Map configuration - matching web version (40x40 tiles at 32px = 1280x1280 world)
const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 1280;
const TILE_SIZE = 32;
const PLAYER_SPEED = 5;
const INTERACTION_DISTANCE = 55;
const NPC_MOVE_SPEED = 1.2; // pixels per frame (~20px/s at 16ms)

// Office coworker configurations — 5 AI personas (matching web UI mapping) + busy background NPCs
const PHILOSOPHERS: PhilosopherData[] = [
  { id: 'socrates', name: 'Rahul (CTO)', personaId: 'cto', x: 300, y: 400, color: '#FFD700', direction: 'right', roamRadius: 80 },
  { id: 'aristotle', name: 'Simran (HR)', personaId: 'hr', x: 500, y: 300, color: '#C0C0C0', direction: 'right', roamRadius: 70 },
  { id: 'plato', name: 'Priya (PM)', personaId: 'pm', x: 700, y: 500, color: '#CD7F32', direction: 'front', roamRadius: 75 },
  { id: 'descartes', name: 'Dev', x: 200, y: 600, color: '#4169E1', direction: 'front', roamRadius: 65, defaultMessage: "Sorry, I'm deep in a debugging session right now. Catch me later!" },
  { id: 'leibniz', name: 'Karan', x: 900, y: 400, color: '#9932CC', direction: 'front', roamRadius: 72, defaultMessage: "In back-to-back meetings all day. Ping me tomorrow!" },
  { id: 'ada_lovelace', name: 'Meera (Designer)', personaId: 'designer', x: 400, y: 700, color: '#FF69B4', direction: 'front', roamRadius: 68 },
  { id: 'turing', name: 'Arjun (Engineer)', personaId: 'swe', x: 600, y: 266, color: '#00CED1', direction: 'front', roamRadius: 77 },
  { id: 'searle', name: 'Sam', x: 800, y: 600, color: '#FF6347', direction: 'front', roamRadius: 73, defaultMessage: "Heads down on a deadline, can't talk right now." },
  { id: 'chomsky', name: 'Nikhil', x: 350, y: 516, color: '#32CD32', direction: 'front', roamRadius: 69, defaultMessage: "On a call with a client — let's sync up later!" },
  { id: 'dennett', name: 'Daniel', x: 550, y: 402, color: '#FF8C00', direction: 'front', roamRadius: 71, defaultMessage: "Writing up my sprint retro notes, catch you in a bit." },
  { id: 'miguel', name: 'Miguel', x: 750, y: 350, color: '#8B4513', direction: 'front', roamRadius: 30, defaultMessage: "Hey there! I'd love to chat, but I'm currently writing my article for tomorrow." },
  { id: 'paul', name: 'Paul', x: 250, y: 350, color: '#2F4F4F', direction: 'front', roamRadius: 30, defaultMessage: "Hey, I'm busy with my latest course. I can't talk right now." },
];

// API Configuration — use machine IP for physical devices, localhost for simulator
const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

// Screens
type Screen = 'menu' | 'game' | 'instructions';

interface Message {
  type: 'user' | 'philosopher';
  text: string;
}

interface PhilosopherData {
  id: string;
  name: string;
  personaId?: string; // backend persona (cto/swe/pm/designer/hr); absent = busy NPC with canned reply
  x: number;
  y: number;
  color: string;
  direction: string;
  defaultMessage?: string;
  roamRadius?: number;
}

interface PhilosopherState {
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  direction: 'front' | 'back' | 'left' | 'right';
  state: 'moving' | 'paused';
  moveDir: 'left' | 'right' | 'up' | 'down' | null;
  stateEndTime: number; // timestamp when current state expires
  roamRadius: number;
  walkFrame: number;
  walkFrameTimer: number;
  isNearPlayer: boolean;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [playerPos, setPlayerPos] = useState({ x: 640, y: 640 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [playerDirection, setPlayerDirection] = useState<'front' | 'back' | 'left' | 'right'>('front');
  const [nearbyPhilosopher, setNearbyPhilosopher] = useState<PhilosopherData | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [activePhilosopher, setActivePhilosopher] = useState<PhilosopherData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [playerWalkFrame, setPlayerWalkFrame] = useState(0);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [mapScale, setMapScale] = useState(1.0);
  const [cameraPan, setCameraPan] = useState({ x: 0, y: 0 });

  // Use REFS for high-frequency game loop values to avoid cascading re-renders
  const playerPosRef = useRef({ x: 640, y: 640 });
  const playerDirRef = useRef<'front' | 'back' | 'left' | 'right'>('front');
  const nearbyPhilRef = useRef<PhilosopherData | null>(null);
  const streamingTextRef = useRef('');
  const joystickPosition = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastSyncTime = useRef(0);
  const walkFrameCounter = useRef(0);
  const walkFrameTimer = useRef(0);
  const isMovingRef = useRef(false);
  const authTokenRef = useRef<string | null>(null);

  // --- Demo workspace login (backend requires JWT for /chat and /ws/chat) ---
  const [demoUsers, setDemoUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; post?: string } | null>(null);

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPost, setAuthPost] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const demoLogin = useCallback(async (user: { id: string; name: string; email: string }) => {
    try {
      const loginRes = await fetch(`${API_BASE_URL}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const { token, user: u } = await loginRes.json();
      authTokenRef.current = token;
      setCurrentUser({ id: u?.id ?? user.id, name: u?.name ?? user.name, email: user.email, post: u?.post });
      setScreen('game');
    } catch (err) {
      console.error('Demo login failed:', err);
    }
  }, []);

  const handleAuthSubmit = useCallback(async () => {
    setAuthError('');
    if (!authEmail.trim() || !authPassword || (authMode === 'signup' && !authName.trim())) {
      setAuthError('Please fill in all fields.');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword,
            post: authPost.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        authTokenRef.current = data.token;
        setCurrentUser({ id: data.user.id, name: data.user.name, email: data.user.email, post: data.user.post });
      } else {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail.trim(),
            password: authPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        authTokenRef.current = data.token;
        setCurrentUser({ id: data.user.id, name: data.user.name, email: data.user.email, post: data.user.post });
      }
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthPost('');
      setScreen('game');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }, [authMode, authEmail, authPassword, authName, authPost]);

  // Fetch demo users on start
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/demo-users`);
        const { users } = await res.json();
        if (users?.length) {
          setDemoUsers(users);
        }
      } catch (err) {
        console.error('Could not load demo users:', err);
      }
    })();
  }, []);

  // Presence heartbeat — lets other tabs/devices see this user as online
  useEffect(() => {
    if (!currentUser) return;
    const authHeaders = () => ({ Authorization: `Bearer ${authTokenRef.current}` });
    const ping = () =>
      fetch(`${API_BASE_URL}/presence/ping`, { method: 'POST', headers: authHeaders() }).catch(() => {});
    ping();
    const interval = setInterval(ping, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // --- Human-to-human chat (DMs with real workspace members) ---
  interface WorkspaceUser { id: string; name: string; online: boolean }
  interface HumanMessage { id: string; text: string; mine: boolean; from_name: string }
  const [humanChatOpen, setHumanChatOpen] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<WorkspaceUser | null>(null);
  const [humanMessages, setHumanMessages] = useState<HumanMessage[]>([]);
  const [humanInput, setHumanInput] = useState('');
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const humanScrollRef = useRef<ScrollView>(null);

  const authedFetch = useCallback((path: string, init?: RequestInit) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokenRef.current}`,
        ...(init?.headers || {}),
      },
    }), []);

  // Poll unread counts (badge on the chat button)
  useEffect(() => {
    if (!currentUser || screen !== 'game') return;
    const poll = async () => {
      try {
        const res = await authedFetch('/dm/unread');
        const { unread } = await res.json();
        const map: Record<string, number> = {};
        (unread || []).forEach((u: any) => { map[u.from_user_id] = u.count; });
        setUnreadByUser(map);
      } catch { }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [currentUser, screen, authedFetch]);

  // Poll workspace directory while the user list is open
  useEffect(() => {
    if (!humanChatOpen || activeChatUser || !currentUser) return;
    const poll = async () => {
      try {
        const res = await authedFetch('/users');
        const { users } = await res.json();
        setWorkspaceUsers(users || []);
      } catch { }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [humanChatOpen, activeChatUser, currentUser, authedFetch]);

  // Poll the open conversation
  useEffect(() => {
    if (!activeChatUser || !currentUser) return;
    const poll = async () => {
      try {
        const res = await authedFetch(`/dm/with/${activeChatUser.id}`);
        const { messages: msgs } = await res.json();
        setHumanMessages(msgs || []);
      } catch { }
    };
    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [activeChatUser, currentUser, authedFetch]);

  const sendHumanMessage = useCallback(async () => {
    const text = humanInput.trim();
    if (!text || !activeChatUser) return;
    setHumanInput('');
    // Optimistic append
    setHumanMessages((prev) => [...prev, { id: `tmp-${prev.length}`, text, mine: true, from_name: currentUser?.name || 'Me' }]);
    try {
      await authedFetch('/dm/send', {
        method: 'POST',
        body: JSON.stringify({ to_user_id: activeChatUser.id, text }),
      });
    } catch (err) {
      console.error('Failed to send DM:', err);
    }
  }, [humanInput, activeChatUser, currentUser, authedFetch]);

  const totalUnread = Object.values(unreadByUser).reduce((a, b) => a + b, 0);

  // NPC roaming state — mutable ref for each philosopher
  const philStatesRef = useRef<PhilosopherState[]>(
    PHILOSOPHERS.map(p => ({
      x: p.x,
      y: p.y,
      spawnX: p.x,
      spawnY: p.y,
      direction: (p.direction || 'front') as any,
      state: 'paused' as const,
      moveDir: null,
      stateEndTime: Date.now() + Math.random() * 3000 + 1000,
      roamRadius: p.roamRadius || 70,
      walkFrame: 0,
      walkFrameTimer: 0,
      isNearPlayer: false,
    }))
  );
  // State for rendering philosopher dynamic positions (synced in throttle)
  const [philPositions, setPhilPositions] = useState(
    PHILOSOPHERS.map(p => ({ x: p.x, y: p.y, direction: p.direction as string, walkFrame: 0, isMoving: false, isNearPlayer: false }))
  );

  // Keep streamingTextRef in sync
  useEffect(() => {
    streamingTextRef.current = streamingText;
  }, [streamingText]);

  // Keyboard controls for laptop/web — arrow keys / WASD drive the same
  // joystickPosition the touch joystick uses. Enter talks, Escape closes.
  const pressedKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (Platform.OS !== 'web' || screen !== 'game') return;

    const applyKeys = () => {
      const k = pressedKeysRef.current;
      const x = (k.has('ArrowRight') || k.has('d') ? 1 : 0) - (k.has('ArrowLeft') || k.has('a') ? 1 : 0);
      const y = (k.has('ArrowDown') || k.has('s') ? 1 : 0) - (k.has('ArrowUp') || k.has('w') ? 1 : 0);
      // Normalize diagonals so they aren't faster
      const len = Math.sqrt(x * x + y * y) || 1;
      joystickPosition.current = { x: x / len, y: y / len };
    };

    // Normalize single chars so WASD works with Shift/Caps Lock held
    const normKey = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't steal keys while typing in the chat inputs
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const key = normKey(e);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        pressedKeysRef.current.add(key);
        applyKeys();
      } else if ((key === 'Enter' || key === ' ') && !dialogueOpen && nearbyPhilRef.current) {
        e.preventDefault();
        setActivePhilosopher(nearbyPhilRef.current);
        setDialogueOpen(true);
        setMessages([]);
        setInputText('');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (pressedKeysRef.current.delete(normKey(e))) applyKeys();
    };

    const onBlur = () => {
      pressedKeysRef.current.clear();
      joystickPosition.current = { x: 0, y: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      onBlur();
    };
  }, [screen, dialogueOpen]);

  // Game loop — uses refs to avoid setState on every frame
  useEffect(() => {
    if (screen !== 'game' || dialogueOpen) return;

    const gameLoop = () => {
      const now = Date.now();
      const { x, y } = joystickPosition.current;
      const pPos = playerPosRef.current;

      // === UPDATE NPC ROAMING ===
      const states = philStatesRef.current;
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        const dx = pPos.x - s.x;
        const dy = pPos.y - s.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        if (distToPlayer < INTERACTION_DISTANCE) {
          // Near player: stop, face player
          s.isNearPlayer = true;
          s.state = 'paused';
          s.moveDir = null;
          s.stateEndTime = now + 500; // re-check soon
          // Face toward player
          if (Math.abs(dx) > Math.abs(dy)) {
            s.direction = dx > 0 ? 'right' : 'left';
          } else {
            s.direction = dy > 0 ? 'front' : 'back';
          }
        } else {
          s.isNearPlayer = false;

          // State machine: check if current state expired
          if (now >= s.stateEndTime) {
            if (Math.random() < 0.4) {
              // Move in random direction for 0.5-1s
              const dirs: ('left' | 'right' | 'up' | 'down')[] = ['left', 'right', 'up', 'down'];
              s.moveDir = dirs[Math.floor(Math.random() * 4)];
              s.state = 'moving';
              s.stateEndTime = now + 500 + Math.random() * 500;
              // Set facing direction
              if (s.moveDir === 'left') s.direction = 'left';
              else if (s.moveDir === 'right') s.direction = 'right';
              else if (s.moveDir === 'up') s.direction = 'back';
              else s.direction = 'front';
            } else {
              // Pause for 2-6s
              s.state = 'paused';
              s.moveDir = null;
              s.stateEndTime = now + 2000 + Math.random() * 4000;
              // Face random direction while idle
              const faceDirs: ('front' | 'back' | 'left' | 'right')[] = ['front', 'back', 'left', 'right'];
              s.direction = faceDirs[Math.floor(Math.random() * 4)];
            }
          }

          // Apply movement
          if (s.state === 'moving' && s.moveDir) {
            let nx = s.x;
            let ny = s.y;
            if (s.moveDir === 'left') nx -= NPC_MOVE_SPEED;
            else if (s.moveDir === 'right') nx += NPC_MOVE_SPEED;
            else if (s.moveDir === 'up') ny -= NPC_MOVE_SPEED;
            else ny += NPC_MOVE_SPEED;

            // Clamp to world bounds
            nx = Math.max(30, Math.min(WORLD_WIDTH - 30, nx));
            ny = Math.max(30, Math.min(WORLD_HEIGHT - 30, ny));

            // Check collision with tilemap
            if (!isWalkable(nx, ny)) {
              // Blocked: reverse direction and choose new state
              s.state = 'paused';
              s.moveDir = null;
              s.stateEndTime = now + 500 + Math.random() * 1000;
            } else {
              // Check roam radius
              const distFromSpawn = Math.sqrt((nx - s.spawnX) ** 2 + (ny - s.spawnY) ** 2);
              if (distFromSpawn > s.roamRadius) {
                // Turn back toward spawn
                const sdx = s.spawnX - s.x;
                const sdy = s.spawnY - s.y;
                if (Math.abs(sdx) > Math.abs(sdy)) {
                  s.moveDir = sdx > 0 ? 'right' : 'left';
                  s.direction = s.moveDir;
                } else {
                  s.moveDir = sdy > 0 ? 'down' : 'up';
                  s.direction = s.moveDir === 'down' ? 'front' : 'back';
                }
                s.stateEndTime = now + 1500;
              } else {
                s.x = nx;
                s.y = ny;
              }
            }

            // Walk frame cycling
            if (now - s.walkFrameTimer > 100) {
              s.walkFrameTimer = now;
              s.walkFrame = (s.walkFrame + 1) % 9;
            }
          }
        }
      }

      // === UPDATE PLAYER ===
      if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
        const prev = playerPosRef.current;
        // Resolve collision with wall-sliding
        const resolved = resolveMovement(prev.x, prev.y, x * PLAYER_SPEED, y * PLAYER_SPEED);
        const newX = Math.max(30, Math.min(WORLD_WIDTH - 30, resolved.x));
        const newY = Math.max(30, Math.min(WORLD_HEIGHT - 30, resolved.y));

        // Only update if position actually changed
        if (newX !== prev.x || newY !== prev.y) {
          playerPosRef.current = { x: newX, y: newY };
          isMovingRef.current = true;

          // Direction via ref
          const newDir: 'front' | 'back' | 'left' | 'right' =
            Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'front' : 'back');
          playerDirRef.current = newDir;

          // Walk animation frame cycling (9 frames, ~100ms per frame)
          if (now - walkFrameTimer.current > 100) {
            walkFrameTimer.current = now;
            walkFrameCounter.current = (walkFrameCounter.current + 1) % 9;
          }

          // Check nearby philosopher using DYNAMIC positions
          let nearest: PhilosopherData | null = null;
          let minDist = INTERACTION_DISTANCE;
          for (let i = 0; i < PHILOSOPHERS.length; i++) {
            const ps = states[i];
            const d = Math.sqrt((newX - ps.x) ** 2 + (newY - ps.y) ** 2);
            if (d < minDist) { minDist = d; nearest = { ...PHILOSOPHERS[i], x: ps.x, y: ps.y, direction: ps.direction }; }
          }
          nearbyPhilRef.current = nearest;

          // Camera offset — free (no clamping to map edges)
          const camX = newX - SCREEN_WIDTH / 2 + cameraPanBase.current.x;
          const camY = newY - SCREEN_HEIGHT / 2 + cameraPanBase.current.y;

          // Throttle React state syncs
          if (now - lastSyncTime.current > 16) {
            lastSyncTime.current = now;
            setPlayerPos({ x: newX, y: newY });
            setCameraOffset({ x: camX, y: camY });
            setPlayerDirection(newDir);
            setNearbyPhilosopher(nearest);
            setPlayerWalkFrame(walkFrameCounter.current);
            setIsPlayerMoving(true);
            // Sync philosopher positions
            setPhilPositions(states.map(s => ({ x: s.x, y: s.y, direction: s.direction, walkFrame: s.walkFrame, isMoving: s.state === 'moving' && !s.isNearPlayer, isNearPlayer: s.isNearPlayer })));
          }
        }
      } else {
        if (isMovingRef.current) {
          isMovingRef.current = false;
          walkFrameCounter.current = 0;
          setIsPlayerMoving(false);
          setPlayerWalkFrame(0);
        }
        // Still sync NPC positions even if player idle
        if (now - lastSyncTime.current > 50) {
          lastSyncTime.current = now;
          // Re-check nearby with dynamic positions
          const pp = playerPosRef.current;
          let nearest: PhilosopherData | null = null;
          let minDist = INTERACTION_DISTANCE;
          for (let i = 0; i < PHILOSOPHERS.length; i++) {
            const ps = states[i];
            const d = Math.sqrt((pp.x - ps.x) ** 2 + (pp.y - ps.y) ** 2);
            if (d < minDist) { minDist = d; nearest = { ...PHILOSOPHERS[i], x: ps.x, y: ps.y, direction: ps.direction }; }
          }
          setNearbyPhilosopher(nearest);
          setPhilPositions(states.map(s => ({ x: s.x, y: s.y, direction: s.direction, walkFrame: s.walkFrame, isMoving: s.state === 'moving' && !s.isNearPlayer, isNearPlayer: s.isNearPlayer })));
        }
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [screen, dialogueOpen]);

  // Pending outbound payloads while the socket is still connecting; flushed
  // on open, or diverted to the HTTP fallback if the connection fails.
  const wsQueueRef = useRef<string[]>([]);

  const sendViaHttp = useCallback((payloadStr: string) => {
    const payload = JSON.parse(payloadStr);
    fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authTokenRef.current ? { Authorization: `Bearer ${authTokenRef.current}` } : {}),
      },
      body: payloadStr,
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages((prev) => [...prev, { type: 'philosopher', text: data.response ?? `Error: ${data.detail || 'no response'}` }]);
        setIsStreaming(false);
      })
      .catch((err) => {
        console.error('API error:', err, payload);
        setMessages((prev) => [...prev, { type: 'philosopher', text: "I can't reach the office server right now. Please try again in a moment." }]);
        setIsStreaming(false);
      });
  }, []);

  // WebSocket connection — uses refs for mutable values to avoid stale closures
  const connectWebSocket = useCallback(() => {
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = authTokenRef.current;
    const wsUrl = token
      ? `${WS_BASE_URL}/ws/chat?token=${encodeURIComponent(token)}`
      : `${WS_BASE_URL}/ws/chat`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Flush anything queued while connecting
      const queued = wsQueueRef.current;
      wsQueueRef.current = [];
      queued.forEach((p) => ws.send(p));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.streaming === true && !data.response) {
        // Initial streaming start signal — ignore (just a status update)
        return;
      } else if (data.chunk) {
        setStreamingText((prev) => prev + data.chunk);
      } else if (data.response) {
        setIsStreaming(false);
        // Read from ref to get latest accumulated text without stale closure
        const finalText = streamingTextRef.current || data.response;
        setMessages((prev) => [...prev, { type: 'philosopher', text: finalText }]);
        setStreamingText('');
      } else if (data.error) {
        setIsStreaming(false);
        setMessages((prev) => [...prev, { type: 'philosopher', text: `Error: ${data.error}` }]);
      }
    };

    // If the socket dies before opening, divert queued messages to HTTP
    const divertQueue = () => {
      const queued = wsQueueRef.current;
      wsQueueRef.current = [];
      queued.forEach(sendViaHttp);
    };
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      divertQueue();
    };
    ws.onclose = () => {
      divertQueue();
    };
  }, [sendViaHttp]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !activePhilosopher) return;

    const userMessage = inputText.trim();
    setMessages((prev) => [...prev, { type: 'user', text: userMessage }]);
    setInputText('');

    // Busy coworkers (no backend persona) reply with their canned message
    if (activePhilosopher.defaultMessage || !activePhilosopher.personaId) {
      setMessages((prev) => [...prev, { type: 'philosopher', text: activePhilosopher.defaultMessage ?? "Sorry, I'm busy right now!" }]);
      return;
    }

    // Use WebSocket for streaming; queued sends flush on open or fall back to HTTP
    setIsStreaming(true);
    setStreamingText('');

    const payload = JSON.stringify({
      message: userMessage,
      persona_id: activePhilosopher.personaId,
    });
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
    } else {
      wsQueueRef.current.push(payload);
      connectWebSocket();
    }
  }, [inputText, activePhilosopher, connectWebSocket]);

  // Start dialogue
  const startDialogue = useCallback(() => {
    if (nearbyPhilosopher) {
      setActivePhilosopher(nearbyPhilosopher);
      setDialogueOpen(true);
      setMessages([]);
      setInputText('');
    }
  }, [nearbyPhilosopher]);

  // Close dialogue
  const closeDialogue = useCallback(() => {
    setDialogueOpen(false);
    setActivePhilosopher(null);
    setMessages([]);
    setInputText('');
    setIsStreaming(false);
    setStreamingText('');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Reset memory — clears MY conversation history with the agents (per-user)
  const resetMemory = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/reset-memory`, {
        method: 'POST',
        headers: authTokenRef.current ? { Authorization: `Bearer ${authTokenRef.current}` } : {},
      });
      closeDialogue();
      console.log('Memory reset successfully');
    } catch (err) {
      console.error('Failed to reset memory:', err);
    }
  }, [closeDialogue]);

  // Logout — tear down everything tied to the current user so the next
  // login starts clean (socket, queued sends, dialogues, DMs, badges)
  const logout = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    wsQueueRef.current = [];
    setDialogueOpen(false);
    setActivePhilosopher(null);
    setMessages([]);
    setInputText('');
    setIsStreaming(false);
    setStreamingText('');
    setHumanChatOpen(false);
    setActiveChatUser(null);
    setHumanMessages([]);
    setHumanInput('');
    setUnreadByUser({});
    authTokenRef.current = null;
    setCurrentUser(null);
    setScreen('menu');
  }, []);

  // Joystick knob animated position (moves visually without re-renders)
  const joystickKnobX = useRef(new Animated.Value(0)).current;
  const joystickKnobY = useRef(new Animated.Value(0)).current;

  // Joystick handlers
  const onJoystickGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;
    const maxDistance = 40; // max visual knob displacement
    const inputScale = 60;  // larger = more responsive input area
    const distance = Math.sqrt(translationX * translationX + translationY * translationY);
    const clampedDist = Math.min(distance, inputScale);
    const normalizedDistance = clampedDist / inputScale;

    if (distance > 0) {
      const dirX = translationX / distance;
      const dirY = translationY / distance;

      // Apply deadzone
      const deadzone = 0.15;
      const effectiveStrength = normalizedDistance > deadzone
        ? (normalizedDistance - deadzone) / (1 - deadzone)
        : 0;

      joystickPosition.current = {
        x: dirX * effectiveStrength,
        y: dirY * effectiveStrength,
      };

      // Move the visual knob (capped to visual radius)
      const visualDist = Math.min(distance, maxDistance);
      joystickKnobX.setValue(dirX * visualDist);
      joystickKnobY.setValue(dirY * visualDist);
    }
  }, [joystickKnobX, joystickKnobY]);

  const onJoystickStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.END || event.nativeEvent.state === State.CANCELLED) {
      joystickPosition.current = { x: 0, y: 0 };
      // Snap knob back to center with spring animation
      Animated.spring(joystickKnobX, { toValue: 0, useNativeDriver: true, tension: 200, friction: 15 }).start();
      Animated.spring(joystickKnobY, { toValue: 0, useNativeDriver: true, tension: 200, friction: 15 }).start();
    }
  }, [joystickKnobX, joystickKnobY]);

  // Pinch-to-zoom handler
  const baseScale = useRef(1.0);
  const onPinchGestureEvent = useCallback((event: PinchGestureHandlerGestureEvent) => {
    const newScale = Math.max(0.3, Math.min(5.0, baseScale.current * event.nativeEvent.scale));
    setMapScale(newScale);
  }, []);

  const onPinchStateChange = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      baseScale.current = Math.max(0.3, Math.min(5.0, baseScale.current * event.nativeEvent.scale));
    }
  }, []);

  // Map drag (one-finger pan on viewport)
  const cameraPanBase = useRef({ x: 0, y: 0 });
  const mapPanRef = useRef<PanGestureHandler>(null);
  const mapPinchRef = useRef<PinchGestureHandler>(null);

  const onMapPanGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;
    // Divide by scale so drag distance matches visual distance
    setCameraPan({
      x: cameraPanBase.current.x - translationX / mapScale,
      y: cameraPanBase.current.y - translationY / mapScale,
    });
  }, [mapScale]);

  const onMapPanStateChange = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      cameraPanBase.current = {
        x: cameraPanBase.current.x - event.nativeEvent.translationX / mapScale,
        y: cameraPanBase.current.y - event.nativeEvent.translationY / mapScale,
      };
    }
  }, [mapScale]);

  // ==================== RENDER MAIN MENU ====================
  if (screen === 'menu') {
    return (
      <View style={styles.menuContainer}>
        <StatusBar barStyle="light-content" />

        {/* Background */}
        <Image
          source={require('./assets/images/talking_philosophers.jpg')}
          style={styles.menuBackground}
          resizeMode="cover"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.menuScrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <Image
              source={require('./assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            {currentUser ? (
              // Logged in UI
              <View style={styles.menuCard}>
                <Text style={styles.menuWelcomeTitle}>WorkVerse</Text>
                <Text style={styles.menuWelcomeText}>
                  Logged in as:{'\n'}
                  <Text style={{ fontWeight: 'bold', color: '#00d4aa', fontSize: 18 }}>
                    {currentUser.name} {currentUser.post ? `(${currentUser.post})` : ''}
                  </Text>
                </Text>

                <TouchableOpacity
                  style={styles.menuActionBtn}
                  onPress={() => setScreen('game')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.menuActionBtnText}>Enter Office</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuActionBtn, { backgroundColor: '#16213e' }]}
                  onPress={() => setScreen('instructions')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.menuActionBtnText}>Instructions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuActionBtn, { backgroundColor: '#7a2e2e' }]}
                  onPress={logout}
                  activeOpacity={0.8}
                >
                  <Text style={styles.menuActionBtnText}>Logout / Switch User</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Authentication UI (Login / Signup)
              <View style={styles.menuCard}>
                <Text style={styles.authTitle}>WorkVerse</Text>
                <Text style={styles.authSubtitle}>
                  {authMode === 'signup' ? 'Create your WorkVerse account' : 'Log in to enter the virtual office'}
                </Text>

                {authError ? (
                  <Text style={styles.authErrorText}>{authError}</Text>
                ) : null}

                {authMode === 'signup' && (
                  <>
                    <TextInput
                      style={styles.authInput}
                      placeholder="Your name"
                      placeholderTextColor="#888"
                      value={authName}
                      onChangeText={setAuthName}
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={styles.authInput}
                      placeholder="Position / Post (e.g. CTO) (optional)"
                      placeholderTextColor="#888"
                      value={authPost}
                      onChangeText={setAuthPost}
                      autoCapitalize="words"
                    />
                  </>
                )}

                <TextInput
                  style={styles.authInput}
                  placeholder="Email"
                  placeholderTextColor="#888"
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TextInput
                  style={styles.authInput}
                  placeholder="Password"
                  placeholderTextColor="#888"
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={styles.authSubmitBtn}
                  onPress={handleAuthSubmit}
                  disabled={authLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.authSubmitBtnText}>
                    {authLoading ? 'Please wait...' : authMode === 'signup' ? 'Sign Up' : 'Log In'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setAuthError('');
                  }}
                  style={{ marginTop: 14 }}
                >
                  <Text style={styles.authToggleText}>
                    {authMode === 'login' ? "No account? Sign up" : "Already have an account? Log in"}
                  </Text>
                </TouchableOpacity>

                {/* Demo user picker */}
                {demoUsers.length > 0 && (
                  <View style={styles.authDemoContainer}>
                    <Text style={styles.authDemoLabel}>Quick demo login — pick a person</Text>
                    <View style={styles.authDemoChips}>
                      {demoUsers.map((u) => (
                        <TouchableOpacity
                          key={u.email}
                          style={styles.authDemoChip}
                          onPress={() => demoLogin(u)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.authDemoChipText}>{u.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ==================== RENDER INSTRUCTIONS ====================
  if (screen === 'instructions') {
    return (
      <View style={styles.instructionsContainer}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.instructionsPanel}>
          <Text style={styles.instructionsTitle}>INSTRUCTIONS</Text>

          <View style={styles.instructionsList}>
            <Text style={styles.instructionText}>• Use joystick or arrow keys / WASD to move</Text>
            <Text style={styles.instructionText}>• Tap "Talk" (or press Enter) near a coworker</Text>
            <Text style={styles.instructionText}>• Type your message and send</Text>
            <Text style={styles.instructionText}>• Tap 💬 to message real teammates</Text>
            <Text style={styles.instructionText}>• Tap X to close dialogue</Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setScreen('menu')}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== RENDER GAME ====================
  return (
    <GestureHandlerRootView style={styles.gameContainer}>
      <StatusBar barStyle="light-content" />

      {/* Game World */}
      <PanGestureHandler
        ref={mapPanRef}
        onGestureEvent={onMapPanGestureEvent}
        onHandlerStateChange={onMapPanStateChange}
        simultaneousHandlers={mapPinchRef}
        minPointers={1}
        maxPointers={2}
      >
        <View style={{ flex: 1 }}>
          <PinchGestureHandler
            ref={mapPinchRef}
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={onPinchStateChange}
            simultaneousHandlers={mapPanRef}
          >
            <View style={styles.gameViewport}>
              {/* World container: scale centered on viewport, then translate for camera */}
              <View
                style={[
                  styles.worldContainer,
                  {
                    transform: [
                      // Move origin to viewport center
                      { translateX: SCREEN_WIDTH / 2 },
                      { translateY: SCREEN_HEIGHT / 2 },
                      // Apply zoom
                      { scale: mapScale },
                      // Move back and apply camera + pan offset
                      { translateX: -(SCREEN_WIDTH / 2) - cameraOffset.x - cameraPan.x + cameraPanBase.current.x },
                      { translateY: -(SCREEN_HEIGHT / 2) - cameraOffset.y - cameraPan.y + cameraPanBase.current.y },
                    ],
                  },
                ]}
              >
                {/* Pre-rendered town background */}
                <Image
                  source={require('./assets/images/philoagents_town.png')}
                  style={{
                    position: 'absolute',
                    width: WORLD_WIDTH,
                    height: WORLD_HEIGHT,
                  }}
                  resizeMode="cover"
                />

                {/* Philosophers — rendered with atlas sprites at dynamic positions */}
                {PHILOSOPHERS.map((phil, i) => {
                  const pp = philPositions[i];
                  const isNearby = nearbyPhilosopher?.id === phil.id;
                  const philFrame = pp.isMoving
                    ? getWalkFrames(phil.id, pp.direction as any)[pp.walkFrame]
                    : getIdleFrame(phil.id, (pp.direction || 'front') as any);
                  return (
                    <View
                      key={phil.id}
                      style={[
                        styles.philosopher,
                        {
                          left: pp.x - 25,
                          top: pp.y - 42,
                        },
                      ]}
                    >
                      {isNearby && (
                        <View style={styles.nearbyGlow} />
                      )}
                      <SpriteRenderer characterId={phil.id} frameName={philFrame} scale={1.8} />
                      <View style={[styles.philosopherLabel, isNearby && styles.philosopherLabelNearby]}>
                        <Text style={styles.philosopherName}>{phil.name}</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Player — rendered with sophia atlas sprite */}
                <View
                  style={[
                    styles.player,
                    {
                      left: playerPos.x - 25,
                      top: playerPos.y - 42,
                    },
                  ]}
                >
                  <SpriteRenderer
                    characterId="sophia"
                    frameName={
                      isPlayerMoving
                        ? getWalkFrames('sophia', playerDirection)[playerWalkFrame]
                        : getIdleFrame('sophia', playerDirection)
                    }
                    scale={1.8}
                  />
                  <Text style={styles.playerLabel}>You</Text>
                </View>
              </View>
            </View>
          </PinchGestureHandler>
        </View>
      </PanGestureHandler>

      {/* Header */}
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={() => setScreen('menu')} style={styles.backButtonTouch}>
          <Text style={styles.backButtonText}>← Menu</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>WorkVerse Office</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => setHumanChatOpen(true)} style={styles.chatButtonTouch}>
            <Text style={styles.chatButtonText}>💬</Text>
            {totalUnread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{totalUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={resetMemory} style={styles.resetButtonTouch}>
            <Text style={styles.resetButtonText}>Reset 🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.resetButtonTouch}>
            <Text style={[styles.resetButtonText, { color: '#ff6b6b' }]}>Logout 🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Controls - Joystick and Interact Button */}
      {!dialogueOpen && (
        <View style={styles.controlsContainer}>
          {/* Joystick */}
          <PanGestureHandler
            onGestureEvent={onJoystickGestureEvent}
            onHandlerStateChange={onJoystickStateChange}
          >
            <View style={styles.joystickOuter}>
              <Animated.View
                style={[
                  styles.joystickInner,
                  {
                    transform: [
                      { translateX: joystickKnobX },
                      { translateY: joystickKnobY },
                    ],
                  },
                ]}
              />
            </View>
          </PanGestureHandler>

          {/* Interact Button */}
          <TouchableOpacity
            style={[
              styles.interactButton,
              nearbyPhilosopher ? styles.interactButtonActive : styles.interactButtonDisabled,
            ]}
            onPress={startDialogue}
            disabled={!nearbyPhilosopher}
          >
            <Text style={styles.interactButtonText}>
              {nearbyPhilosopher ? `Talk to\n${nearbyPhilosopher.name}` : 'Walk near a\ncoworker'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dialogue Box */}
      {dialogueOpen && activePhilosopher && (
        <KeyboardAvoidingView
          style={styles.dialogueOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.dialogueBox}>
            {/* Header */}
            <View style={styles.dialogueHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.dialogueAvatar, { backgroundColor: activePhilosopher.color }]} />
                <Text style={styles.dialogueHeaderText}>{activePhilosopher.name}</Text>
              </View>
              <TouchableOpacity onPress={closeDialogue} style={styles.dialogueCloseButton}>
                <Text style={styles.dialogueCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.type === 'user' ? styles.userMessage : styles.philosopherMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              ))}

              {/* Streaming text */}
              {isStreaming && streamingText && (
                <View style={[styles.messageBubble, styles.philosopherMessage]}>
                  <Text style={styles.messageText}>{streamingText}</Text>
                </View>
              )}

              {/* Typing indicator */}
              {isStreaming && !streamingText && (
                <View style={[styles.messageBubble, styles.philosopherMessage]}>
                  <Text style={styles.messageText}>...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input area - matching web version with blinking cursor */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#666"
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim()}
              >
                <Text style={styles.sendButtonText}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Human-to-human chat panel */}
      {humanChatOpen && (
        <KeyboardAvoidingView
          style={styles.dialogueOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.dialogueBox}>
            {/* Header */}
            <View style={styles.dialogueHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {activeChatUser && (
                  <TouchableOpacity onPress={() => { setActiveChatUser(null); setHumanMessages([]); }}>
                    <Text style={styles.chatBackText}>←</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.dialogueHeaderText}>
                  {activeChatUser ? activeChatUser.name : `Teammates${currentUser ? ` — you are ${currentUser.name}` : ''}`}
                </Text>
                {activeChatUser?.online && <View style={styles.onlineDot} />}
              </View>
              <TouchableOpacity
                onPress={() => { setHumanChatOpen(false); setActiveChatUser(null); setHumanMessages([]); }}
                style={styles.dialogueCloseButton}
              >
                <Text style={styles.dialogueCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {!activeChatUser ? (
              /* User directory */
              <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
                {workspaceUsers.length === 0 && (
                  <Text style={styles.chatEmptyText}>Loading teammates…</Text>
                )}
                {workspaceUsers.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.userRow}
                    onPress={() => setActiveChatUser(u)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.presenceDot, u.online ? styles.presenceOnline : styles.presenceOffline]} />
                    <Text style={styles.userRowName}>{u.name}</Text>
                    {unreadByUser[u.id] > 0 && (
                      <View style={[styles.unreadBadge, { position: 'relative', top: 0, right: 0 }]}>
                        <Text style={styles.unreadBadgeText}>{unreadByUser[u.id]}</Text>
                      </View>
                    )}
                    <Text style={styles.userRowStatus}>{u.online ? 'online' : 'offline'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              /* Conversation */
              <>
                <ScrollView
                  ref={humanScrollRef}
                  style={styles.messagesContainer}
                  contentContainerStyle={styles.messagesContent}
                  onContentSizeChange={() => humanScrollRef.current?.scrollToEnd({ animated: true })}
                >
                  {humanMessages.length === 0 && (
                    <Text style={styles.chatEmptyText}>No messages yet — say hi!</Text>
                  )}
                  {humanMessages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageBubble,
                        msg.mine ? styles.userMessage : styles.philosopherMessage,
                      ]}
                    >
                      <Text style={styles.messageText}>{msg.text}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={humanInput}
                    onChangeText={setHumanInput}
                    placeholder={`Message ${activeChatUser.name}…`}
                    placeholderTextColor="#666"
                    onSubmitEditing={sendHumanMessage}
                    returnKeyType="send"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !humanInput.trim() && styles.sendButtonDisabled]}
                    onPress={sendHumanMessage}
                    disabled={!humanInput.trim()}
                  >
                    <Text style={styles.sendButtonText}>➤</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // ==================== MENU STYLES ====================
  menuContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  menuBackground: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    opacity: 0.8,
  },
  menuScrollContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: SCREEN_WIDTH * 0.8,
    height: 120,
    marginVertical: 20,
  },
  menuCard: {
    width: SCREEN_WIDTH * 0.88,
    maxWidth: 380,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#5B4FCF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  menuWelcomeTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  menuWelcomeText: {
    color: '#a0a0a0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  menuActionBtn: {
    backgroundColor: '#5B4FCF',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  menuActionBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  authTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  authSubtitle: {
    color: '#a0a0a0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  authErrorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  authInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  authSubmitBtn: {
    backgroundColor: '#5B4FCF',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#5B4FCF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  authSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authToggleText: {
    color: '#5B4FCF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  authDemoContainer: {
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  authDemoLabel: {
    color: '#a0a0a0',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  authDemoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  authDemoChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  authDemoChipText: {
    color: '#fff',
    fontSize: 13,
  },

  // ==================== INSTRUCTIONS STYLES ====================
  instructionsContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsPanel: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#000',
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
  },
  instructionsList: {
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 18,
    color: '#000',
    marginBottom: 12,
  },
  closeButton: {
    backgroundColor: '#87CEEB',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    alignSelf: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },

  // ==================== GAME STYLES ====================
  gameContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gameViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  worldContainer: {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    position: 'absolute',
  },
  tileBackground: {
    position: 'absolute',
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    opacity: 0.1,
  },
  groundLayer: {
    position: 'absolute',
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  building: {
    position: 'absolute',
    backgroundColor: '#8B7355',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#5D4E37',
  },
  fountain: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4169E1',
    borderWidth: 6,
    borderColor: '#A9A9A9',
  },
  philosopher: {
    position: 'absolute',
    alignItems: 'center',
  },
  nearbyGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,217,61,0.25)',
    top: 10,
    alignSelf: 'center',
  },
  philosopherLabel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  philosopherLabelNearby: {
    backgroundColor: 'rgba(255,217,61,0.9)',
  },
  philosopherName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  player: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
  },
  playerLabel: {
    color: '#FFD93D',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gameHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  backButtonTouch: {
    padding: 8,
  },
  backButtonText: {
    color: '#87CEEB',
    fontSize: 16,
  },
  resetButtonTouch: {
    padding: 8,
  },
  resetButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  gameTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // ==================== CONTROLS STYLES ====================
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    alignItems: 'flex-end',
  },
  joystickOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  joystickInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  interactButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactButtonActive: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  interactButtonDisabled: {
    backgroundColor: 'rgba(100,100,100,0.5)',
  },
  interactButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // ==================== DIALOGUE STYLES ====================
  dialogueOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  dialogueBox: {
    backgroundColor: 'rgba(20,20,30,0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  dialogueAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dialogueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dialogueHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dialogueCloseButton: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogueCloseText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  messagesContainer: {
    maxHeight: 250,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 8,
  },
  userMessage: {
    backgroundColor: 'rgba(65,105,225,0.85)',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  philosopherMessage: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
  },

  // ==================== USER PICKER (MENU) ====================
  userPickerContainer: {
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 420,
  },
  userPickerLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  userPickerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  userChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  userChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#fff',
  },
  userChipText: {
    color: '#ddd',
    fontSize: 13,
  },
  userChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // ==================== HUMAN CHAT ====================
  chatButtonTouch: {
    padding: 4,
  },
  chatButtonText: {
    fontSize: 20,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#F44336',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  chatBackText: {
    color: '#fff',
    fontSize: 20,
    paddingRight: 4,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  presenceOnline: {
    backgroundColor: '#4CAF50',
  },
  presenceOffline: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  userRowName: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  userRowStatus: {
    color: '#888',
    fontSize: 12,
  },
  chatEmptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});

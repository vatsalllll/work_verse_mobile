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

// Philosopher configurations - matching web version spawn points
const PHILOSOPHERS: PhilosopherData[] = [
  { id: 'socrates', name: 'Socrates', x: 300, y: 400, color: '#FFD700', direction: 'right', roamRadius: 80 },
  { id: 'aristotle', name: 'Aristotle', x: 500, y: 300, color: '#C0C0C0', direction: 'right', roamRadius: 70 },
  { id: 'plato', name: 'Plato', x: 700, y: 500, color: '#CD7F32', direction: 'front', roamRadius: 75 },
  { id: 'descartes', name: 'Descartes', x: 200, y: 600, color: '#4169E1', direction: 'front', roamRadius: 65 },
  { id: 'leibniz', name: 'Leibniz', x: 900, y: 400, color: '#9932CC', direction: 'front', roamRadius: 72 },
  { id: 'ada_lovelace', name: 'Ada Lovelace', x: 400, y: 700, color: '#FF69B4', direction: 'front', roamRadius: 68 },
  { id: 'turing', name: 'Turing', x: 600, y: 266, color: '#00CED1', direction: 'front', roamRadius: 77 },
  { id: 'searle', name: 'Searle', x: 800, y: 600, color: '#FF6347', direction: 'front', roamRadius: 73 },
  { id: 'chomsky', name: 'Chomsky', x: 350, y: 516, color: '#32CD32', direction: 'front', roamRadius: 69 },
  { id: 'dennett', name: 'Dennett', x: 550, y: 402, color: '#FF8C00', direction: 'front', roamRadius: 71 },
  { id: 'miguel', name: 'Miguel', x: 750, y: 350, color: '#8B4513', direction: 'front', roamRadius: 30, defaultMessage: "Hey there! I'm Miguel, but you can call me Mr Agent. I'd love to chat, but I'm currently writing my Substack article for tomorrow." },
  { id: 'paul', name: 'Paul', x: 250, y: 350, color: '#2F4F4F', direction: 'front', roamRadius: 30, defaultMessage: "Hey, I'm busy teaching my cat AI with my latest course. I can't talk right now. Check out Decoding ML for more on my thoughts." },
];

// API Configuration — use machine IP for physical devices, localhost for simulator
const API_BASE_URL = 'http://10.108.57.208:8000';
const WS_BASE_URL = 'ws://10.108.57.208:8000';

// Screens
type Screen = 'menu' | 'game' | 'instructions';

interface Message {
  type: 'user' | 'philosopher';
  text: string;
}

interface PhilosopherData {
  id: string;
  name: string;
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

  // WebSocket connection — uses streamingTextRef to avoid dependency on streamingText state
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current = new WebSocket(`${WS_BASE_URL}/ws/chat`);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
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

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket closed');
    };
  }, []); // No dependencies — uses refs for mutable values

  // Send message
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !activePhilosopher) return;

    const userMessage = inputText.trim();
    setMessages((prev) => [...prev, { type: 'user', text: userMessage }]);
    setInputText('');

    // Check for default message philosophers (Miguel, Paul)
    if (activePhilosopher.defaultMessage) {
      setMessages((prev) => [...prev, { type: 'philosopher', text: activePhilosopher.defaultMessage! }]);
      return;
    }

    // Use WebSocket for streaming
    setIsStreaming(true);
    setStreamingText('');

    connectWebSocket();

    // Wait for connection
    setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          message: userMessage,
          philosopher_id: activePhilosopher.id,
        }));
      } else {
        // Fallback to HTTP
        fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            philosopher_id: activePhilosopher.id,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            setMessages((prev) => [...prev, { type: 'philosopher', text: data.response }]);
            setIsStreaming(false);
          })
          .catch((err) => {
            console.error('API error:', err);
            setMessages((prev) => [...prev, { type: 'philosopher', text: "I'm tired right now, I can't talk. Please try again later." }]);
            setIsStreaming(false);
          });
      }
    }, 500);
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

  // Reset memory — clears conversation state on backend
  const resetMemory = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/reset-memory`, { method: 'POST' });
      closeDialogue();
      console.log('Memory reset successfully');
    } catch (err) {
      console.error('Failed to reset memory:', err);
    }
  }, [closeDialogue]);

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

        {/* Logo */}
        <Image
          source={require('./assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Buttons */}
        <View style={styles.menuButtonsContainer}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen('game')}
            activeOpacity={0.8}
          >
            <Text style={styles.menuButtonText}>Let's Play!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen('instructions')}
            activeOpacity={0.8}
          >
            <Text style={styles.menuButtonText}>Instructions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => { }}
            activeOpacity={0.8}
          >
            <Text style={styles.menuButtonText}>Support Philoagents</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.instructionText}>• Use joystick for moving</Text>
            <Text style={styles.instructionText}>• Tap "Talk" button near philosophers</Text>
            <Text style={styles.instructionText}>• Type your message and send</Text>
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
        <Text style={styles.gameTitle}>PhiloAgents Town</Text>
        <TouchableOpacity onPress={resetMemory} style={styles.resetButtonTouch}>
          <Text style={styles.resetButtonText}>Reset 🔄</Text>
        </TouchableOpacity>
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
              {nearbyPhilosopher ? `Talk to\n${nearbyPhilosopher.name}` : 'Walk near a\nphilosopher'}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // ==================== MENU STYLES ====================
  menuContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  menuBackground: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    opacity: 0.9,
  },
  logo: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.8,
    height: 200,
  },
  menuButtonsContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.15,
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  menuButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#666',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    minWidth: 280,
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
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
});

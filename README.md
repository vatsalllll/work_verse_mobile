# PhiloAgents Mobile

A React Native (Expo) mobile game where you can walk around a philosophical town and have AI-powered conversations with history's greatest philosophers.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app on your phone (for testing)
- The PhiloAgents backend running (see main project README)

### Installation

1. Navigate to the mobile app directory:
```bash
cd philoagents-mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## 🎮 How to Play

1. **Move**: Use the virtual joystick in the bottom-left corner
2. **Approach**: Walk near any philosopher (their label will highlight)
3. **Talk**: Tap the "Talk" button when near a philosopher
4. **Chat**: Type your questions and receive AI responses
5. **Close**: Tap X or walk away to end the conversation

## 🏛️ Featured Philosophers

- **Socrates** - Ethics & Socratic Method
- **Aristotle** - Logic & Natural Science
- **Plato** - Theory of Forms & The Republic
- **Descartes** - Rationalism & Cogito
- **Leibniz** - Metaphysics & Calculus
- **Ada Lovelace** - Computing Pioneer
- **Turing** - AI & Computation Theory
- **Searle** - Philosophy of Mind
- **Chomsky** - Linguistics & Politics
- **Dennett** - Consciousness Studies

## 📁 Project Structure

```
philoagents-mobile/
├── App.tsx                      # Main entry point
├── src/
│   ├── screens/                 # App screens
│   │   ├── MainMenuScreen.tsx   # Main menu
│   │   ├── GameScreen.tsx       # Main game
│   │   └── InstructionsScreen.tsx
│   ├── game/
│   │   ├── constants.ts         # Game configuration
│   │   ├── entities/            # Game entities (Player, Philosophers)
│   │   └── systems/             # ECS systems (Movement, AI, Interaction)
│   ├── components/              # UI components
│   │   ├── VirtualJoystick.tsx  # Touch joystick control
│   │   ├── InteractionButton.tsx
│   │   └── DialogueOverlay.tsx  # Chat interface
│   ├── services/                # API services
│   │   ├── WebSocketService.ts  # Real-time chat
│   │   └── ApiService.ts        # HTTP fallback
│   └── styles/
│       └── theme.ts             # Design tokens
```

## ⚙️ Configuration

### Backend Connection

By default, the app connects to `ws://localhost:8000`. To connect from a physical device:

1. Find your computer's local IP address
2. Update `src/game/constants.ts`:
```typescript
export const API = {
  WS_URL: 'ws://YOUR_LOCAL_IP:8000/ws/chat',
  HTTP_URL: 'http://YOUR_LOCAL_IP:8000',
};
```

### Running on Simulator

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android
```

## 🛠️ Tech Stack

- **React Native** with Expo
- **react-native-game-engine** - ECS game architecture
- **react-native-gesture-handler** - Touch controls
- **react-native-reanimated** - Smooth animations
- **@react-navigation/native** - Navigation
- **expo-linear-gradient** - UI effects

## 📱 Features

- ✅ Virtual joystick for 8-directional movement
- ✅ Philosopher NPCs with AI roaming behavior
- ✅ Real-time WebSocket chat with streaming responses
- ✅ Beautiful dark theme with premium aesthetics
- ✅ Animated dialogue overlay
- ✅ Nearby interaction indicators

## 📝 License

MIT License - See main project for details

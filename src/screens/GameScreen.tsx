// Main Game Screen with react-native-game-engine

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, StatusBar, Text } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Player from '../game/entities/Player';
import Philosopher from '../game/entities/Philosopher';
import GameWorld from '../game/entities/GameWorld';

import MovementSystem from '../game/systems/MovementSystem';
import InteractionSystem from '../game/systems/InteractionSystem';
import PhilosopherAISystem from '../game/systems/PhilosopherAISystem';

import VirtualJoystick from '../components/VirtualJoystick';
import InteractionButton from '../components/InteractionButton';
import DialogueOverlay from '../components/DialogueOverlay';

import { SCREEN, PLAYER, PHILOSOPHERS_CONFIG, COLORS } from '../game/constants';
import { theme } from '../styles/theme';

interface PhilosopherEntity {
    id: string;
    name: string;
    color: string;
    position: { x: number; y: number };
    isNearby: boolean;
}

const GameScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const gameEngineRef = useRef<any>(null);

    const [nearbyPhilosopher, setNearbyPhilosopher] = useState<PhilosopherEntity | null>(null);
    const [dialogueVisible, setDialogueVisible] = useState(false);
    const [selectedPhilosopher, setSelectedPhilosopher] = useState<PhilosopherEntity | null>(null);

    // Initialize game entities
    const createEntities = () => {
        const entities: any = {
            world: {
                position: { x: 0, y: 0 },
                offset: { x: 0, y: 0 },
                renderer: <GameWorld offset={{ x: 0, y: 0 }} />,
            },
            player: {
                position: { x: PLAYER.INITIAL_X, y: PLAYER.INITIAL_Y },
                velocity: { x: 0, y: 0 },
                direction: 'down' as const,
                renderer: <Player position={{ x: PLAYER.INITIAL_X, y: PLAYER.INITIAL_Y }} direction="down" />,
            },
        };

        // Add philosophers
        PHILOSOPHERS_CONFIG.forEach((config) => {
            entities[`philosopher_${config.id}`] = {
                id: config.id,
                name: config.name,
                color: config.color,
                position: { x: config.x, y: config.y },
                isNearby: false,
                renderer: (
                    <Philosopher
                        position={{ x: config.x, y: config.y }}
                        name={config.name}
                        color={config.color}
                        isNearby={false}
                    />
                ),
            };
        });

        return entities;
    };

    // Handle game events
    const handleGameEvent = useCallback((event: any) => {
        if (event.type === 'philosopher-nearby') {
            setNearbyPhilosopher(event.philosopher);
        } else if (event.type === 'philosopher-not-nearby') {
            setNearbyPhilosopher(null);
        } else if (event.type === 'philosopher-interaction') {
            setSelectedPhilosopher(event.philosopher);
            setDialogueVisible(true);
        }
    }, []);

    // Handle joystick input
    const handleJoystickMove = useCallback((direction: { x: number; y: number }) => {
        if (gameEngineRef.current) {
            gameEngineRef.current.dispatch({ type: 'joystick-move', joystick: direction });
        }
    }, []);

    const handleJoystickRelease = useCallback(() => {
        if (gameEngineRef.current) {
            gameEngineRef.current.dispatch({ type: 'joystick-release' });
        }
    }, []);

    // Handle interaction button
    const handleInteraction = useCallback(() => {
        if (nearbyPhilosopher) {
            setSelectedPhilosopher(nearbyPhilosopher);
            setDialogueVisible(true);
        }
    }, [nearbyPhilosopher]);

    // Close dialogue
    const handleCloseDialogue = useCallback(() => {
        setDialogueVisible(false);
        setSelectedPhilosopher(null);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND} />

            {/* Game title bar */}
            <View style={[styles.titleBar, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.title}>PhiloAgents</Text>
                <Text style={styles.subtitle}>Walk around and talk to philosophers</Text>
            </View>

            {/* Game Engine */}
            <View style={styles.gameContainer}>
                <GameEngine
                    ref={gameEngineRef}
                    style={styles.gameEngine}
                    systems={[MovementSystem, InteractionSystem, PhilosopherAISystem]}
                    entities={createEntities()}
                    onEvent={handleGameEvent}
                    running={!dialogueVisible}
                />
            </View>

            {/* Touch Controls */}
            {!dialogueVisible && (
                <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + 16 }]}>
                    <VirtualJoystick
                        onMove={handleJoystickMove}
                        onRelease={handleJoystickRelease}
                        size={120}
                    />
                    <InteractionButton
                        onPress={handleInteraction}
                        isNearPhilosopher={!!nearbyPhilosopher}
                        philosopherName={nearbyPhilosopher?.name}
                    />
                </View>
            )}

            {/* Dialogue Overlay */}
            <DialogueOverlay
                visible={dialogueVisible}
                philosopherId={selectedPhilosopher?.id || ''}
                philosopherName={selectedPhilosopher?.name || ''}
                philosopherColor={selectedPhilosopher?.color || theme.colors.primary}
                onClose={handleCloseDialogue}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    titleBar: {
        backgroundColor: COLORS.SURFACE,
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        color: COLORS.TEXT,
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        color: COLORS.TEXT_SECONDARY,
        fontSize: 12,
        marginTop: 2,
    },
    gameContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    gameEngine: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
    },
});

export default GameScreen;

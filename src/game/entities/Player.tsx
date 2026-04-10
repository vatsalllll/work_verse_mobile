// Player entity component for the game engine

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { PLAYER, COLORS } from '../constants';

interface PlayerProps {
    position: { x: number; y: number };
    direction: 'up' | 'down' | 'left' | 'right';
}

const Player: React.FC<PlayerProps> = ({ position, direction }) => {
    // Direction indicator (arrow showing which way player faces)
    const getDirectionIndicator = () => {
        const arrows: Record<string, string> = {
            up: '▲',
            down: '▼',
            left: '◀',
            right: '▶',
        };
        return arrows[direction] || '▼';
    };

    return (
        <View
            style={[
                styles.container,
                {
                    left: position.x - PLAYER.SIZE / 2,
                    top: position.y - PLAYER.SIZE / 2,
                },
            ]}
        >
            <View style={styles.player}>
                <View style={styles.head} />
                <View style={styles.body} />
                <Text style={styles.direction}>{getDirectionIndicator()}</Text>
            </View>
            <Text style={styles.label}>You</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: PLAYER.SIZE,
        height: PLAYER.SIZE + 16,
        alignItems: 'center',
        zIndex: 100,
    },
    player: {
        width: PLAYER.SIZE,
        height: PLAYER.SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    head: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFD93D',
        position: 'absolute',
        top: 4,
    },
    body: {
        width: 28,
        height: 24,
        borderRadius: 6,
        backgroundColor: COLORS.PRIMARY,
        position: 'absolute',
        bottom: 4,
    },
    direction: {
        position: 'absolute',
        bottom: -2,
        fontSize: 10,
        color: '#fff',
    },
    label: {
        marginTop: 2,
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.TEXT,
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});

export default Player;

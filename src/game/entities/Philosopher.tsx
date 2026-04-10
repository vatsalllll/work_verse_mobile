// Philosopher NPC entity component

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { PHILOSOPHER, COLORS } from '../constants';

interface PhilosopherProps {
    position: { x: number; y: number };
    name: string;
    color: string;
    isNearby?: boolean;
}

const Philosopher: React.FC<PhilosopherProps> = ({
    position,
    name,
    color,
    isNearby = false,
}) => {
    return (
        <View
            style={[
                styles.container,
                {
                    left: position.x - PHILOSOPHER.SIZE / 2,
                    top: position.y - PHILOSOPHER.SIZE / 2,
                },
            ]}
        >
            {/* Interaction indicator */}
            {isNearby && (
                <View style={styles.interactionIndicator}>
                    <Text style={styles.indicatorText}>💬</Text>
                </View>
            )}

            {/* Philosopher sprite */}
            <View style={[styles.philosopher, { borderColor: color }]}>
                <View style={[styles.head, { backgroundColor: color }]} />
                <View style={[styles.body, { backgroundColor: color }]} />
                <View style={styles.robe} />
            </View>

            {/* Name label */}
            <View style={[styles.labelContainer, isNearby && styles.labelNearby]}>
                <Text style={styles.label} numberOfLines={1}>
                    {name}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: PHILOSOPHER.SIZE,
        alignItems: 'center',
        zIndex: 50,
    },
    philosopher: {
        width: PHILOSOPHER.SIZE,
        height: PHILOSOPHER.SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderRadius: PHILOSOPHER.SIZE / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    head: {
        width: 18,
        height: 18,
        borderRadius: 9,
        position: 'absolute',
        top: 6,
        opacity: 0.9,
    },
    body: {
        width: 24,
        height: 18,
        borderRadius: 4,
        position: 'absolute',
        bottom: 6,
        opacity: 0.7,
    },
    robe: {
        position: 'absolute',
        bottom: 4,
        width: 28,
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 4,
    },
    interactionIndicator: {
        position: 'absolute',
        top: -24,
        backgroundColor: COLORS.ACCENT,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 200,
    },
    indicatorText: {
        fontSize: 14,
    },
    labelContainer: {
        marginTop: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    labelNearby: {
        backgroundColor: COLORS.PRIMARY,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.TEXT,
        textAlign: 'center',
    },
});

export default Philosopher;

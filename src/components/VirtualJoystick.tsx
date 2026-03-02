// Virtual Joystick component for player movement

import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';
import { theme } from '../styles/theme';

interface VirtualJoystickProps {
    onMove: (direction: { x: number; y: number }) => void;
    onRelease: () => void;
    size?: number;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
    onMove,
    onRelease,
    size = 120,
}) => {
    const knobPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const maxDistance = size / 2 - 20;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: () => {
                // Reset position when touch starts
                knobPosition.setOffset({ x: 0, y: 0 });
                knobPosition.setValue({ x: 0, y: 0 });
            },

            onPanResponderMove: (_, gestureState) => {
                // Calculate distance from center
                const distance = Math.sqrt(
                    gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy
                );

                // Clamp to max distance
                let x = gestureState.dx;
                let y = gestureState.dy;

                if (distance > maxDistance) {
                    x = (gestureState.dx / distance) * maxDistance;
                    y = (gestureState.dy / distance) * maxDistance;
                }

                // Update knob position
                knobPosition.setValue({ x, y });

                // Normalize and send direction
                const normalizedX = x / maxDistance;
                const normalizedY = y / maxDistance;
                onMove({ x: normalizedX, y: normalizedY });
            },

            onPanResponderRelease: () => {
                // Animate back to center
                Animated.spring(knobPosition, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: false,
                    friction: 5,
                }).start();

                onRelease();
            },
        })
    ).current;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <View
                style={[
                    styles.base,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    },
                ]}
            >
                {/* Direction indicators */}
                <View style={[styles.indicator, styles.indicatorUp]}>
                    <View style={styles.arrow} />
                </View>
                <View style={[styles.indicator, styles.indicatorDown]}>
                    <View style={[styles.arrow, { transform: [{ rotate: '180deg' }] }]} />
                </View>
                <View style={[styles.indicator, styles.indicatorLeft]}>
                    <View style={[styles.arrow, { transform: [{ rotate: '-90deg' }] }]} />
                </View>
                <View style={[styles.indicator, styles.indicatorRight]}>
                    <View style={[styles.arrow, { transform: [{ rotate: '90deg' }] }]} />
                </View>

                {/* Joystick knob */}
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        styles.knob,
                        {
                            width: size * 0.4,
                            height: size * 0.4,
                            borderRadius: (size * 0.4) / 2,
                            transform: [
                                { translateX: knobPosition.x },
                                { translateY: knobPosition.y },
                            ],
                        },
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    base: {
        backgroundColor: theme.colors.joystickBase,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    knob: {
        backgroundColor: theme.colors.joystickKnob,
        position: 'absolute',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        ...theme.shadows.medium,
    },
    indicator: {
        position: 'absolute',
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indicatorUp: { top: 8 },
    indicatorDown: { bottom: 8 },
    indicatorLeft: { left: 8 },
    indicatorRight: { right: 8 },
    arrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    },
});

export default VirtualJoystick;

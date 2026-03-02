// Interaction button for talking to philosophers

import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Animated,
    View,
} from 'react-native';
import { theme } from '../styles/theme';

interface InteractionButtonProps {
    onPress: () => void;
    disabled?: boolean;
    isNearPhilosopher?: boolean;
    philosopherName?: string;
}

const InteractionButton: React.FC<InteractionButtonProps> = ({
    onPress,
    disabled = false,
    isNearPhilosopher = false,
    philosopherName,
}) => {
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (isNearPhilosopher) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isNearPhilosopher, pulseAnim]);

    return (
        <View style={styles.container}>
            {isNearPhilosopher && philosopherName && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>Talk to {philosopherName}</Text>
                </View>
            )}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                    onPress={onPress}
                    disabled={disabled || !isNearPhilosopher}
                    style={[
                        styles.button,
                        isNearPhilosopher ? styles.buttonActive : styles.buttonDisabled,
                    ]}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonIcon}>💬</Text>
                    <Text
                        style={[
                            styles.buttonText,
                            !isNearPhilosopher && styles.buttonTextDisabled,
                        ]}
                    >
                        Talk
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    tooltip: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.md,
        marginBottom: 8,
        ...theme.shadows.small,
    },
    tooltipText: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: '600',
    },
    button: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        ...theme.shadows.medium,
    },
    buttonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.secondary,
    },
    buttonDisabled: {
        backgroundColor: 'rgba(100, 100, 100, 0.5)',
        borderColor: 'rgba(150, 150, 150, 0.5)',
    },
    buttonIcon: {
        fontSize: 24,
        marginBottom: 2,
    },
    buttonText: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: 'bold',
    },
    buttonTextDisabled: {
        color: 'rgba(255, 255, 255, 0.5)',
    },
});

export default InteractionButton;

// Main Menu Screen

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';

interface MainMenuScreenProps {
    navigation: any;
}

const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const handlePlayPress = () => {
        navigation.navigate('Game');
    };

    const handleInstructionsPress = () => {
        navigation.navigate('Instructions');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            {/* Background gradient */}
            <LinearGradient
                colors={[theme.colors.background, theme.colors.surface, theme.colors.background]}
                style={StyleSheet.absoluteFill}
            />

            {/* Content */}
            <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
                {/* Logo area */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoEmoji}>🏛️</Text>
                    </View>
                    <Text style={styles.title}>PhiloAgents</Text>
                    <Text style={styles.subtitle}>Converse with History's Greatest Minds</Text>
                </View>

                {/* Decorative philosophers preview */}
                <View style={styles.philosophersPreview}>
                    <View style={styles.previewRow}>
                        {['🧔', '👨‍🦳', '👩', '🧓', '👨‍🔬'].map((emoji, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.previewAvatar,
                                    { transform: [{ translateY: index % 2 === 0 ? 0 : -10 }] },
                                ]}
                            >
                                <Text style={styles.previewEmoji}>{emoji}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Menu buttons */}
                <View style={[styles.buttonsContainer, { paddingBottom: insets.bottom + 40 }]}>
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={handlePlayPress}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[theme.colors.primary, theme.colors.primaryDark]}
                            style={styles.buttonGradient}
                        >
                            <Text style={styles.playButtonText}>Let's Play!</Text>
                            <Text style={styles.playButtonIcon}>▶</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleInstructionsPress}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.secondaryButtonText}>📖  Instructions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => { }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.secondaryButtonText}>⭐  Support PhiloAgents</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Version */}
            <Text style={[styles.version, { bottom: insets.bottom + 16 }]}>
                v1.0.0 • Mobile Edition
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 3,
        borderColor: theme.colors.primary,
        ...theme.shadows.large,
    },
    logoEmoji: {
        fontSize: 48,
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
        textShadowColor: theme.colors.primary,
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    philosophersPreview: {
        alignItems: 'center',
        marginVertical: 32,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    previewAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    previewEmoji: {
        fontSize: 24,
    },
    buttonsContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        gap: 16,
    },
    playButton: {
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.medium,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 32,
        gap: 12,
    },
    playButtonText: {
        color: theme.colors.text,
        fontSize: 22,
        fontWeight: 'bold',
    },
    playButtonIcon: {
        color: theme.colors.text,
        fontSize: 18,
    },
    secondaryButton: {
        backgroundColor: theme.colors.surfaceLight,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    secondaryButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    version: {
        position: 'absolute',
        alignSelf: 'center',
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
});

export default MainMenuScreen;

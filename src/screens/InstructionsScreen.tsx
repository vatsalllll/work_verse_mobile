// Instructions Screen

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';

interface InstructionsScreenProps {
    navigation: any;
}

const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const instructions = [
        {
            icon: '🕹️',
            title: 'Move Around',
            description: 'Use the virtual joystick in the bottom-left corner to move your character around the town.',
        },
        {
            icon: '👋',
            title: 'Approach Philosophers',
            description: 'Walk near any philosopher. When close enough, their name will be highlighted.',
        },
        {
            icon: '💬',
            title: 'Start Conversation',
            description: 'Tap the "Talk" button in the bottom-right corner when near a philosopher.',
        },
        {
            icon: '✍️',
            title: 'Ask Questions',
            description: 'Type your question in the chat and hit send. The philosopher will respond in their unique style.',
        },
        {
            icon: '🤔',
            title: 'Explore Ideas',
            description: 'Each philosopher has their own knowledge and personality. Ask about their works, ideas, and philosophies!',
        },
        {
            icon: '✕',
            title: 'Close Dialogue',
            description: 'Tap the X button or walk away to end the conversation.',
        },
    ];

    const philosophers = [
        { name: 'Socrates', specialty: 'Ethics & Method' },
        { name: 'Aristotle', specialty: 'Logic & Science' },
        { name: 'Plato', specialty: 'Forms & Republic' },
        { name: 'Descartes', specialty: 'Rationalism' },
        { name: 'Leibniz', specialty: 'Metaphysics' },
        { name: 'Ada Lovelace', specialty: 'Computing' },
        { name: 'Turing', specialty: 'AI & Computation' },
        { name: 'Searle', specialty: 'Mind & Language' },
        { name: 'Chomsky', specialty: 'Linguistics' },
        { name: 'Dennett', specialty: 'Consciousness' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Instructions</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* How to Play Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎮 How to Play</Text>
                    {instructions.map((instruction, index) => (
                        <View key={index} style={styles.instructionCard}>
                            <View style={styles.instructionIcon}>
                                <Text style={styles.iconText}>{instruction.icon}</Text>
                            </View>
                            <View style={styles.instructionContent}>
                                <Text style={styles.instructionTitle}>{instruction.title}</Text>
                                <Text style={styles.instructionDescription}>
                                    {instruction.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Philosophers Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🏛️ Meet the Philosophers</Text>
                    <View style={styles.philosophersGrid}>
                        {philosophers.map((philosopher, index) => (
                            <View key={index} style={styles.philosopherCard}>
                                <Text style={styles.philosopherName}>{philosopher.name}</Text>
                                <Text style={styles.philosopherSpecialty}>{philosopher.specialty}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Tips Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💡 Tips</Text>
                    <View style={styles.tipCard}>
                        <Text style={styles.tipText}>
                            • Each philosopher has unique knowledge about their historical works and ideas.
                        </Text>
                        <Text style={styles.tipText}>
                            • Try asking open-ended questions to get more detailed responses.
                        </Text>
                        <Text style={styles.tipText}>
                            • The AI will respond in the style and perspective of each philosopher.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        color: theme.colors.text,
        fontSize: 20,
    },
    headerTitle: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        color: theme.colors.text,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    instructionCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    instructionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconText: {
        fontSize: 24,
    },
    instructionContent: {
        flex: 1,
    },
    instructionTitle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    instructionDescription: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    philosophersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    philosopherCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.sm,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    philosopherName: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    philosopherSpecialty: {
        color: theme.colors.primary,
        fontSize: 11,
        marginTop: 2,
    },
    tipCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    tipText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 8,
    },
});

export default InstructionsScreen;

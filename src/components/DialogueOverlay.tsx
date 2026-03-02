// Dialogue overlay for chatting with philosophers

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { theme } from '../styles/theme';
import WebSocketService from '../services/WebSocketService';

interface DialogueOverlayProps {
    visible: boolean;
    philosopherId: string;
    philosopherName: string;
    philosopherColor: string;
    onClose: () => void;
}

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    isStreaming?: boolean;
}

const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
    visible,
    philosopherId,
    philosopherName,
    philosopherColor,
    onClose,
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(100)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (visible) {
            // Reset state for new conversation
            setMessages([
                {
                    id: '0',
                    text: `Hello! I am ${philosopherName}. What would you like to discuss?`,
                    isUser: false,
                },
            ]);
            setInputText('');
            setStreamingText('');

            // Animate in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Animate out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 100,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, fadeAnim, slideAnim, philosopherName]);

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            isUser: true,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);
        setStreamingText('');

        try {
            await WebSocketService.sendMessage(philosopherId, userMessage.text, {
                onStreamingStart: () => {
                    setStreamingText('');
                },
                onChunk: (chunk: string) => {
                    setStreamingText((prev) => prev + chunk);
                },
                onStreamingEnd: () => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: (Date.now() + 1).toString(),
                            text: streamingText,
                            isUser: false,
                        },
                    ]);
                    setStreamingText('');
                    setIsLoading(false);
                },
                onMessage: (response: string) => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: (Date.now() + 1).toString(),
                            text: response,
                            isUser: false,
                        },
                    ]);
                    setIsLoading(false);
                },
            });
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    text: "I'm having trouble connecting. Please try again.",
                    isUser: false,
                },
            ]);
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        WebSocketService.disconnect();
        onClose();
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <Animated.View
                    style={[
                        styles.container,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: philosopherColor }]}>
                        <View style={styles.headerContent}>
                            <Text style={styles.headerTitle}>{philosopherName}</Text>
                            <Text style={styles.headerSubtitle}>Philosopher</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Messages */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.messagesContainer}
                        contentContainerStyle={styles.messagesContent}
                        onContentSizeChange={() =>
                            scrollViewRef.current?.scrollToEnd({ animated: true })
                        }
                    >
                        {messages.map((message) => (
                            <View
                                key={message.id}
                                style={[
                                    styles.messageBubble,
                                    message.isUser
                                        ? styles.userMessage
                                        : styles.philosopherMessage,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.messageText,
                                        message.isUser && styles.userMessageText,
                                    ]}
                                >
                                    {message.text}
                                </Text>
                            </View>
                        ))}

                        {/* Streaming message */}
                        {streamingText && (
                            <View style={[styles.messageBubble, styles.philosopherMessage]}>
                                <Text style={styles.messageText}>{streamingText}</Text>
                            </View>
                        )}

                        {/* Loading indicator */}
                        {isLoading && !streamingText && (
                            <View style={[styles.messageBubble, styles.philosopherMessage]}>
                                <Text style={styles.loadingText}>...</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Input area */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Ask a question..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            maxLength={500}
                            editable={!isLoading}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            style={[
                                styles.sendButton,
                                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                            ]}
                            disabled={!inputText.trim() || isLoading}
                        >
                            <Text style={styles.sendButtonText}>➤</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.overlay,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '80%',
        minHeight: '50%',
        ...theme.shadows.large,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: theme.spacing.md,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.sm,
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: theme.colors.primary,
    },
    philosopherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surfaceLight,
    },
    messageText: {
        color: theme.colors.text,
        fontSize: 15,
        lineHeight: 22,
    },
    userMessageText: {
        color: theme.colors.text,
    },
    loadingText: {
        color: theme.colors.textSecondary,
        fontSize: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        color: theme.colors.text,
        fontSize: 15,
        maxHeight: 100,
        marginRight: theme.spacing.sm,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(100, 100, 100, 0.5)',
    },
    sendButtonText: {
        color: theme.colors.text,
        fontSize: 18,
    },
});

export default DialogueOverlay;

// WebSocket service for real-time communication with the AI backend

import { API } from '../game/constants';

type MessageCallback = (response: string) => void;
type ChunkCallback = (chunk: string) => void;
type StreamingCallback = (isStreaming: boolean) => void;

interface WebSocketCallbacks {
    onMessage?: MessageCallback;
    onChunk?: ChunkCallback;
    onStreamingStart?: () => void;
    onStreamingEnd?: () => void;
}

class WebSocketService {
    private socket: WebSocket | null = null;
    private messageCallbacks: Map<string, Function> = new Map();
    private connected: boolean = false;
    private connectionPromise: Promise<void> | null = null;
    private connectionTimeout: number = 10000;
    private baseUrl: string;

    constructor() {
        this.baseUrl = API.WS_URL;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    connect(): Promise<void> {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (this.socket) {
                    this.socket.close();
                }
                this.connectionPromise = null;
                reject(new Error('WebSocket connection timeout'));
            }, this.connectionTimeout);

            this.socket = new WebSocket(this.baseUrl);

            this.socket.onopen = () => {
                console.log('WebSocket connection established');
                this.connected = true;
                clearTimeout(timeoutId);
                resolve();
            };

            this.socket.onmessage = this.handleMessage.bind(this);

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                clearTimeout(timeoutId);
                this.connectionPromise = null;
                reject(error);
            };

            this.socket.onclose = () => {
                console.log('WebSocket connection closed');
                this.connected = false;
                this.connectionPromise = null;
            };
        });

        return this.connectionPromise;
    }

    private handleMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error('WebSocket error:', data.error);
                return;
            }

            if (data.streaming !== undefined) {
                this.handleStreamingUpdate(data.streaming);
                return;
            }

            if (data.chunk) {
                this.triggerCallback('chunk', data.chunk);
                return;
            }

            if (data.response) {
                this.triggerCallback('message', data.response);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    private handleStreamingUpdate(isStreaming: boolean) {
        const streamingCallback = this.messageCallbacks.get('streaming');
        if (streamingCallback) {
            streamingCallback(isStreaming);
        }
    }

    private triggerCallback(type: string, data: any) {
        const callback = this.messageCallbacks.get(type);
        if (callback) {
            callback(data);
        }
    }

    async sendMessage(
        philosopherId: string,
        message: string,
        callbacks: WebSocketCallbacks = {}
    ): Promise<string | null> {
        try {
            if (!this.connected) {
                await this.connect();
            }

            this.registerCallbacks(callbacks);

            this.socket?.send(
                JSON.stringify({
                    message: message,
                    philosopher_id: philosopherId,
                })
            );

            return null;
        } catch (error) {
            console.error('Error sending message via WebSocket:', error);
            return "I'm having trouble connecting right now. Please try again.";
        }
    }

    private registerCallbacks(callbacks: WebSocketCallbacks) {
        if (callbacks.onMessage) {
            this.messageCallbacks.set('message', callbacks.onMessage);
        }

        if (callbacks.onStreamingStart) {
            this.messageCallbacks.set('streaming', (isStreaming: boolean) => {
                if (isStreaming) {
                    callbacks.onStreamingStart?.();
                } else if (callbacks.onStreamingEnd) {
                    callbacks.onStreamingEnd();
                }
            });
        }

        if (callbacks.onChunk) {
            this.messageCallbacks.set('chunk', callbacks.onChunk);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.connected = false;
            this.connectionPromise = null;
            this.messageCallbacks.clear();
        }
    }

    isConnected(): boolean {
        return this.connected;
    }
}

export default new WebSocketService();

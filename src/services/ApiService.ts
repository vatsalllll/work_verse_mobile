// HTTP API service for fallback communication

import { API } from '../game/constants';

class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API.HTTP_URL;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    async sendMessage(philosopherId: string, message: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    philosopher_id: philosopherId,
                    message: message,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response || "I couldn't understand that. Could you rephrase?";
        } catch (error) {
            console.error('API error:', error);
            return "I'm having trouble connecting right now. Please try again later.";
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

export default new ApiService();

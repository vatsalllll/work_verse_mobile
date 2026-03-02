// Color palette and typography for the app

export const theme = {
    colors: {
        primary: '#5B4FCF',
        primaryDark: '#4338CA',
        secondary: '#87CEEB',
        background: '#0f0f23',
        surface: '#1a1a2e',
        surfaceLight: '#16213e',
        text: '#ffffff',
        textSecondary: '#a0a0a0',
        accent: '#e94560',
        success: '#00d4aa',
        warning: '#ffd93d',
        error: '#ff6b6b',
        dialogueBg: 'rgba(22, 33, 62, 0.95)',
        overlay: 'rgba(0, 0, 0, 0.7)',
        joystickBase: 'rgba(255, 255, 255, 0.2)',
        joystickKnob: 'rgba(255, 255, 255, 0.5)',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 20,
        xl: 28,
        full: 9999,
    },
    typography: {
        title: {
            fontSize: 32,
            fontWeight: 'bold' as const,
        },
        subtitle: {
            fontSize: 24,
            fontWeight: '600' as const,
        },
        body: {
            fontSize: 16,
            fontWeight: 'normal' as const,
        },
        caption: {
            fontSize: 12,
            fontWeight: 'normal' as const,
        },
    },
    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 4,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.37,
            shadowRadius: 7.49,
            elevation: 8,
        },
    },
};

export default theme;

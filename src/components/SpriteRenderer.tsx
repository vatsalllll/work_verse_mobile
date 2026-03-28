/**
 * SpriteRenderer — Renders a single frame from a sprite atlas PNG.
 * 
 * Uses the atlas JSON to find the frame's x/y/w/h coordinates,
 * then crops the atlas image using a container with overflow:hidden
 * and negative translate offsets.
 */
import React, { useMemo } from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';

// Pre-loaded atlas JSON data for each character
import sophiaAtlas from '../../assets/images/characters/sophia/atlas.json';
import socratesAtlas from '../../assets/images/characters/socrates/atlas.json';
import aristotleAtlas from '../../assets/images/characters/aristotle/atlas.json';
import platoAtlas from '../../assets/images/characters/plato/atlas.json';
import descartesAtlas from '../../assets/images/characters/descartes/atlas.json';
import leibnizAtlas from '../../assets/images/characters/leibniz/atlas.json';
import adaAtlas from '../../assets/images/characters/ada/atlas.json';
import turingAtlas from '../../assets/images/characters/turing/atlas.json';
import searleAtlas from '../../assets/images/characters/searle/atlas.json';
import chomskyAtlas from '../../assets/images/characters/chomsky/atlas.json';
import dennettAtlas from '../../assets/images/characters/dennett/atlas.json';
import miguelAtlas from '../../assets/images/characters/miguel/atlas.json';
import paulAtlas from '../../assets/images/characters/paul/atlas.json';

// Atlas JSON lookup by character ID
const ATLAS_DATA: Record<string, any> = {
    sophia: sophiaAtlas,
    socrates: socratesAtlas,
    aristotle: aristotleAtlas,
    plato: platoAtlas,
    descartes: descartesAtlas,
    leibniz: leibnizAtlas,
    ada_lovelace: adaAtlas,
    turing: turingAtlas,
    searle: searleAtlas,
    chomsky: chomskyAtlas,
    dennett: dennettAtlas,
    miguel: miguelAtlas,
    paul: paulAtlas,
};

// Atlas image sources (require must be static)
const ATLAS_IMAGES: Record<string, ImageSourcePropType> = {
    sophia: require('../../assets/images/characters/sophia/atlas.png'),
    socrates: require('../../assets/images/characters/socrates/atlas.png'),
    aristotle: require('../../assets/images/characters/aristotle/atlas.png'),
    plato: require('../../assets/images/characters/plato/atlas.png'),
    descartes: require('../../assets/images/characters/descartes/atlas.png'),
    leibniz: require('../../assets/images/characters/leibniz/atlas.png'),
    ada_lovelace: require('../../assets/images/characters/ada/atlas.png'),
    turing: require('../../assets/images/characters/turing/atlas.png'),
    searle: require('../../assets/images/characters/searle/atlas.png'),
    chomsky: require('../../assets/images/characters/chomsky/atlas.png'),
    dennett: require('../../assets/images/characters/dennett/atlas.png'),
    miguel: require('../../assets/images/characters/miguel/atlas.png'),
    paul: require('../../assets/images/characters/paul/atlas.png'),
};

interface SpriteRendererProps {
    characterId: string;
    frameName: string;
    scale?: number;
}

/**
 * Get the walk animation frame names for a given character and direction
 */
export function getWalkFrames(characterId: string, direction: 'front' | 'back' | 'left' | 'right'): string[] {
    const frames: string[] = [];
    for (let i = 0; i <= 8; i++) {
        frames.push(`${characterId}-${direction}-walk-${i.toString().padStart(4, '0')}`);
    }
    return frames;
}

/**
 * Get the idle frame name for a character facing a direction
 */
export function getIdleFrame(characterId: string, direction: 'front' | 'back' | 'left' | 'right'): string {
    return `${characterId}-${direction}`;
}

const SpriteRenderer: React.FC<SpriteRendererProps> = React.memo(({ characterId, frameName, scale = 1.8 }) => {
    const atlasData = ATLAS_DATA[characterId];
    const atlasImage = ATLAS_IMAGES[characterId];

    const frameInfo = useMemo(() => {
        if (!atlasData?.frames?.[frameName]) {
            // Fallback: try idle front
            const fallback = `${characterId}-front`;
            if (atlasData?.frames?.[fallback]) {
                return atlasData.frames[fallback].frame;
            }
            return null;
        }
        return atlasData.frames[frameName].frame;
    }, [atlasData, frameName, characterId]);

    if (!frameInfo || !atlasImage) {
        // Fallback: colored rectangle
        return (
            <View style={{ width: 28 * scale, height: 47 * scale, backgroundColor: '#888', borderRadius: 8 }} />
        );
    }

    const { x, y, w, h } = frameInfo;
    const atlasWidth = atlasData.meta.size.w;
    const atlasHeight = atlasData.meta.size.h;

    return (
        <View style={{
            width: w * scale,
            height: h * scale,
            overflow: 'hidden',
        }}>
            <Image
                source={atlasImage}
                style={{
                    width: atlasWidth * scale,
                    height: atlasHeight * scale,
                    transform: [
                        { translateX: -x * scale },
                        { translateY: -y * scale },
                    ],
                }}
                resizeMode="cover"
            />
        </View>
    );
});

export default SpriteRenderer;

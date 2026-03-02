// Game world background component

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SCREEN, COLORS } from '../constants';

interface GameWorldProps {
    offset: { x: number; y: number };
}

const GameWorld: React.FC<GameWorldProps> = ({ offset }) => {
    // Create a grid pattern for the town floor
    const renderGrid = () => {
        const tiles = [];
        const tileSize = 40;
        const rows = Math.ceil(SCREEN.HEIGHT / tileSize) + 4;
        const cols = Math.ceil(SCREEN.WIDTH / tileSize) + 4;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const isAlternate = (row + col) % 2 === 0;
                tiles.push(
                    <View
                        key={`tile-${row}-${col}`}
                        style={[
                            styles.tile,
                            {
                                left: col * tileSize - (offset.x % tileSize) - tileSize,
                                top: row * tileSize - (offset.y % tileSize) - tileSize,
                                backgroundColor: isAlternate ? '#2a3f5f' : '#243552',
                            },
                        ]}
                    />
                );
            }
        }
        return tiles;
    };

    // Decorative elements (trees, columns, etc.)
    const renderDecorations = () => {
        const decorations = [
            { x: 50, y: 50, type: 'column' },
            { x: 350, y: 80, type: 'column' },
            { x: 30, y: 350, type: 'tree' },
            { x: 370, y: 450, type: 'tree' },
            { x: 200, y: 550, type: 'fountain' },
        ];

        return decorations.map((dec, index) => {
            if (dec.type === 'column') {
                return (
                    <View
                        key={`dec-${index}`}
                        style={[styles.column, { left: dec.x, top: dec.y }]}
                    >
                        <View style={styles.columnTop} />
                        <View style={styles.columnBody} />
                    </View>
                );
            }
            if (dec.type === 'tree') {
                return (
                    <View
                        key={`dec-${index}`}
                        style={[styles.tree, { left: dec.x, top: dec.y }]}
                    >
                        <View style={styles.treeTop} />
                        <View style={styles.treeTrunk} />
                    </View>
                );
            }
            if (dec.type === 'fountain') {
                return (
                    <View
                        key={`dec-${index}`}
                        style={[styles.fountain, { left: dec.x, top: dec.y }]}
                    />
                );
            }
            return null;
        });
    };

    return (
        <View style={styles.container}>
            {renderGrid()}
            {renderDecorations()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: SCREEN.WIDTH,
        height: SCREEN.HEIGHT,
        backgroundColor: COLORS.BACKGROUND,
        overflow: 'hidden',
    },
    tile: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    column: {
        position: 'absolute',
        alignItems: 'center',
    },
    columnTop: {
        width: 24,
        height: 8,
        backgroundColor: '#c9b896',
        borderRadius: 2,
    },
    columnBody: {
        width: 16,
        height: 40,
        backgroundColor: '#d4c4a8',
    },
    tree: {
        position: 'absolute',
        alignItems: 'center',
    },
    treeTop: {
        width: 30,
        height: 30,
        backgroundColor: '#2d5a27',
        borderRadius: 15,
    },
    treeTrunk: {
        width: 8,
        height: 16,
        backgroundColor: '#8b4513',
        marginTop: -4,
    },
    fountain: {
        position: 'absolute',
        width: 50,
        height: 50,
        backgroundColor: '#4a90a4',
        borderRadius: 25,
        borderWidth: 4,
        borderColor: '#c9b896',
    },
});

export default GameWorld;

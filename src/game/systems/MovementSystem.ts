// Movement system - handles player movement based on joystick input

import { PLAYER, SCREEN } from '../constants';

interface Entity {
    position: { x: number; y: number };
    velocity?: { x: number; y: number };
    direction?: 'up' | 'down' | 'left' | 'right';
    renderer?: any;
}

interface Entities {
    player: Entity;
    [key: string]: Entity;
}

interface Touch {
    joystick?: { x: number; y: number };
}

interface GameEngineEvent {
    type: string;
    joystick?: { x: number; y: number };
}

const MovementSystem = (
    entities: Entities,
    { touches, events }: { touches: Touch[]; events: GameEngineEvent[] }
) => {
    const player = entities.player;
    if (!player) return entities;

    // Process joystick events
    let joystickInput = { x: 0, y: 0 };

    events.forEach((event) => {
        if (event.type === 'joystick-move' && event.joystick) {
            joystickInput = event.joystick;
        }
        if (event.type === 'joystick-release') {
            joystickInput = { x: 0, y: 0 };
        }
    });

    // Apply velocity based on joystick input
    const newVelocity = {
        x: joystickInput.x * PLAYER.SPEED,
        y: joystickInput.y * PLAYER.SPEED,
    };

    // Update direction based on movement
    let newDirection = player.direction || 'down';
    if (Math.abs(newVelocity.x) > Math.abs(newVelocity.y)) {
        newDirection = newVelocity.x > 0 ? 'right' : 'left';
    } else if (Math.abs(newVelocity.y) > 0.1) {
        newDirection = newVelocity.y > 0 ? 'down' : 'up';
    }

    // Calculate new position
    let newX = player.position.x + newVelocity.x;
    let newY = player.position.y + newVelocity.y;

    // Boundary constraints
    const padding = PLAYER.SIZE / 2;
    newX = Math.max(padding, Math.min(SCREEN.WIDTH - padding, newX));
    newY = Math.max(padding + 60, Math.min(SCREEN.HEIGHT - padding - 120, newY)); // Account for UI

    // Update player entity
    entities.player = {
        ...player,
        position: { x: newX, y: newY },
        velocity: newVelocity,
        direction: newDirection,
    };

    return entities;
};

export default MovementSystem;

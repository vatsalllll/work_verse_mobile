// Philosopher AI system - handles NPC roaming behavior

import { PHILOSOPHER, SCREEN } from '../constants';

interface Position {
    x: number;
    y: number;
}

interface Entity {
    position: Position;
    velocity?: { x: number; y: number };
    targetPosition?: Position;
    roamTimer?: number;
    id?: string;
    [key: string]: any;
}

interface Entities {
    [key: string]: Entity;
}

// Random number in range
const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
};

// Get new random target position
const getNewTarget = (currentPos: Position, roamRadius: number = 80): Position => {
    const padding = PHILOSOPHER.SIZE;
    const newX = Math.max(
        padding,
        Math.min(
            SCREEN.WIDTH - padding,
            currentPos.x + randomInRange(-roamRadius, roamRadius)
        )
    );
    const newY = Math.max(
        padding + 60,
        Math.min(
            SCREEN.HEIGHT - padding - 120,
            currentPos.y + randomInRange(-roamRadius, roamRadius)
        )
    );
    return { x: newX, y: newY };
};

const PhilosopherAISystem = (entities: Entities, { time }: { time: { delta: number } }) => {
    Object.keys(entities).forEach((key) => {
        if (!key.startsWith('philosopher_')) return;

        const philosopher = entities[key];

        // Initialize roaming state if needed
        if (!philosopher.targetPosition) {
            philosopher.targetPosition = getNewTarget(philosopher.position);
            philosopher.roamTimer = randomInRange(2000, 5000);
        }

        // Update roam timer
        philosopher.roamTimer = (philosopher.roamTimer || 0) - time.delta;

        // Get new target when timer expires
        if (philosopher.roamTimer <= 0) {
            philosopher.targetPosition = getNewTarget(philosopher.position);
            philosopher.roamTimer = randomInRange(3000, 6000);
        }

        // Move towards target
        const target = philosopher.targetPosition;
        const pos = philosopher.position;
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 2) {
            const speed = PHILOSOPHER.ROAM_SPEED;
            const moveX = (dx / distance) * speed;
            const moveY = (dy / distance) * speed;

            entities[key] = {
                ...philosopher,
                position: {
                    x: pos.x + moveX,
                    y: pos.y + moveY,
                },
                velocity: { x: moveX, y: moveY },
            };
        } else {
            // Reached target, stay still briefly
            entities[key] = {
                ...philosopher,
                velocity: { x: 0, y: 0 },
            };
        }
    });

    return entities;
};

export default PhilosopherAISystem;

// Interaction system - detects nearby philosophers and handles interactions

import { PHILOSOPHER } from '../constants';

interface Position {
    x: number;
    y: number;
}

interface Entity {
    position: Position;
    id?: string;
    name?: string;
    isNearby?: boolean;
    [key: string]: any;
}

interface Entities {
    player: Entity;
    [key: string]: Entity;
}

interface GameEngineEvent {
    type: string;
}

type DispatchFunction = (event: GameEngineEvent & { philosopher?: Entity }) => void;

const InteractionSystem = (
    entities: Entities,
    { events, dispatch }: { events: GameEngineEvent[]; dispatch: DispatchFunction }
) => {
    const player = entities.player;
    if (!player) return entities;

    // Calculate distance between two points
    const getDistance = (pos1: Position, pos2: Position): number => {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // Find nearby philosopher
    let nearbyPhilosopher: Entity | null = null;
    let minDistance = PHILOSOPHER.INTERACTION_DISTANCE;

    Object.keys(entities).forEach((key) => {
        if (key.startsWith('philosopher_')) {
            const philosopher = entities[key];
            const distance = getDistance(player.position, philosopher.position);

            if (distance < minDistance) {
                minDistance = distance;
                nearbyPhilosopher = philosopher;
            }

            // Update isNearby status for visual feedback
            entities[key] = {
                ...philosopher,
                isNearby: distance < PHILOSOPHER.INTERACTION_DISTANCE,
            };
        }
    });

    // Handle interaction event
    events.forEach((event) => {
        if (event.type === 'interact' && nearbyPhilosopher) {
            dispatch({
                type: 'philosopher-interaction',
                philosopher: nearbyPhilosopher,
            });
        }
    });

    // Dispatch nearby status for UI updates
    if (nearbyPhilosopher) {
        dispatch({
            type: 'philosopher-nearby',
            philosopher: nearbyPhilosopher,
        });
    } else {
        dispatch({ type: 'philosopher-not-nearby' });
    }

    return entities;
};

export default InteractionSystem;

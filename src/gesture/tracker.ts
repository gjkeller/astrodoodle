import { detect } from './gesture';

export type TimedPoint = [number, number, number];

export const playerMap: Map<number, TimedPoint[]> = new Map();

const DETECTION_COOLDOWN_MS = 400;
const MIN_POINTS_TO_DETECT = 4;

function detectAllPlayers(): { results: Record<number, ReturnType<typeof detect>[]>; elapsedMs: number } {
    const start = performance.now();
    const results: Record<number, ReturnType<typeof detect>[]> = {};
    for (const [playerId, points] of playerMap.entries()) {
        while (points.length > 0  && points[0][2] + MAX_TIME < performance.now()) {
            points.splice(0, 1);
        }

        if (points.length < MIN_POINTS_TO_DETECT) {
            continue;
        }

        const [, , lastTimestamp] = points[points.length - 1];
        if (start - lastTimestamp < DETECTION_COOLDOWN_MS) {
            continue;
        }

        const detections: ReturnType<typeof detect>[] = [];
        for (let offset = 0; offset < points.length; offset += 5) {
            const slice = points.slice(offset);
            if (slice.length === 0) continue;
            const res = detect(slice);
            if (res) {
                detections.push(res);
            }
        }
        if (detections.length > 0) {
            results[playerId] = detections;
        }
    }
    const end = performance.now();
    return { results, elapsedMs: end - start };
}

const MAX_TIME = 3000;

export function addPoint(x: number, y: number, playerId: number) {
    const timestamp = performance.now();
    const arr = playerMap.get(playerId);
    if (arr) {
        arr.push([x, y, timestamp]);
        while (arr.length > 0  && arr[0][2] + MAX_TIME < performance.now()) {
            arr.splice(0, 1);
        }
    } else {
        playerMap.set(playerId, [[x, y, timestamp]]);
    }
}

export function deletePlayer(playerId: number): boolean {
    return playerMap.delete(playerId);
}

/**
 * Reset the gesture tracker by clearing all player data
 * This should be called when starting a new game to ensure clean state
 */
export function resetTracker(): void {
    playerMap.clear();
}

/*
	// --- Tracker demo ---
	setInterval(() => {
		const x1 = Math.random();
		const y1 = Math.random();
		addPoint(x1, y1, 1);
		const x2 = Math.random();
		const y2 = Math.random();
		addPoint(x2, y2, 2);
	}, 1000 / 60);

	// Print detectAllPlayers results every 0.25s
	setInterval(() => {
		const results = detectAllPlayers();
		console.log('detectAllPlayers', results);
	}, 1000);
*/  


/**
 * Gets the best gesture detection for each player with fixed thresholds per gesture
 * @param removeDetectedPlayers Whether to remove players with detected gestures (default: true)
 * @returns A map of player IDs to their best detected gesture name
 */
export function getBestPlayerGestures(removeDetectedPlayers: boolean = true): Map<number, string> {
    const { results: allResults } = detectAllPlayers();
    const bestGestures = new Map<number, string>();

    // Fixed thresholds for each gesture type
    const gestureThresholds: Record<string, number> = {
        'five-point star': 0.2,
        'triangle': 0.2,
        'null': 0.15,
        'arrowhead': 0.25
    };

    for (const [playerKey, detections] of Object.entries(allResults)) {
        if (!detections || detections.length === 0) {
            continue;
        }
        const validDetections = detections.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
        if (validDetections.length === 0) {
            continue;
        }
        const playerId = Number(playerKey);
        
        console.log(`[Player ${playerId}] BEFORE filtering:`, validDetections.map(d => `${d.Name}: ${d.Score.toFixed(3)}`));
        
        // Filter detections based on gesture-specific thresholds
        const filteredDetections = validDetections.filter(detection => {
            const threshold = gestureThresholds[detection.Name] || 0.12; // fallback threshold
            return detection.Score > threshold;
        });
        
        console.log(`[Player ${playerId}] AFTER filtering:`, filteredDetections.map(d => `${d.Name}: ${d.Score.toFixed(3)}`));
        
        if (filteredDetections.length > 0) {
            // Get the best detection after filtering
            const maxResult = filteredDetections.reduce((best, current) => current.Score > best.Score ? current : best);
            console.log(`[Player ${playerId}] SELECTED:`, `${maxResult.Name}: ${maxResult.Score.toFixed(3)}`);
            
            bestGestures.set(playerId, maxResult.Name);
            if (removeDetectedPlayers) {
                deletePlayer(playerId);
            }
        } else {
            console.log(`[Player ${playerId}] No gestures passed threshold filters`);
        }
    }
    
    return bestGestures;
}
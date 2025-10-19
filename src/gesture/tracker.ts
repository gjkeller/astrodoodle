import { detect } from './gesture';

export type TimedPoint = [number, number, number];

export const playerMap: Map<number, TimedPoint[]> = new Map();

const DETECTION_COOLDOWN_MS = 200;
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
 * Gets the best gesture detection for each player
 * @param threshold Optional score threshold for detection (default: 0.12)
 * @param removeDetectedPlayers Whether to remove players with detected gestures (default: true)
 * @returns A map of player IDs to their best detected gesture name
 */
export function getBestPlayerGestures(threshold: number = 0.12, removeDetectedPlayers: boolean = true): Map<number, string> {
    const { results: allResults } = detectAllPlayers();
    const bestGestures = new Map<number, string>();

    for (const [playerKey, detections] of Object.entries(allResults)) {
        if (!detections || detections.length === 0) {
            continue;
        }
        const validDetections = detections.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
        if (validDetections.length === 0) {
            continue;
        }
        const playerId = Number(playerKey);
        const maxResult = validDetections.reduce((best, current) => current.Score > best.Score ? current : best);
        
        if (maxResult.Score > threshold) {
            bestGestures.set(playerId, maxResult.Name);
            if (removeDetectedPlayers) {
                deletePlayer(playerId);
            }
        }
    }
    
    return bestGestures;
}
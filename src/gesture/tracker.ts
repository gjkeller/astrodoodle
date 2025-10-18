import { detect } from './gesture';

export type TimedPoint = [number, number, number];

export const playerMap: Map<number, TimedPoint[]> = new Map();

export function detectAllPlayers(): { results: Record<number, ReturnType<typeof detect>[]>; elapsedMs: number } {
    const start = performance.now();
    const results: Record<number, ReturnType<typeof detect>[]> = {};
    for (const [playerId, points] of playerMap.entries()) {
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

const MAX_POINTS = 80;

export function addPoint(x: number, y: number, playerId: number) {
    const timestamp = 0;
    const arr = playerMap.get(playerId);
    if (arr) {
        arr.push([x, y, timestamp]);
        if (arr.length > MAX_POINTS) {
            arr.splice(0, arr.length - MAX_POINTS);
        }
    } else {
        playerMap.set(playerId, [[x, y, timestamp]]);
    }
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
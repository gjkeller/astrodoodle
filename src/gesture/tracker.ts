import { detect } from './gesture';


const playerMap: Map<number, [[number,number]]> = new Map();

export function detectAllPlayers() {
    const start = performance.now();
    const results: Record<number, any> = {};
    for (const [playerId, points] of playerMap.entries()) {
        results[playerId] = detect(points);
    }
    const end = performance.now();
    return { results, elapsedMs: end - start };
}

const MAX_POINTS = 500;

export function addPoint(x: number, y: number, playerId: number) {
    const arr = playerMap.get(playerId);
    if (arr) {
        arr.push([x, y]);
        if (arr.length > MAX_POINTS) {
            arr.splice(0, arr.length - MAX_POINTS);
        }
    } else {
        playerMap.set(playerId, [[x, y]]);
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
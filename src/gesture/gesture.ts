
import GestureRecognizer from '@2players/dollar1-unistroke-recognizer';

export function detect(points: [number, number][]) {
    // The default export from `dollarq.js` is a constructor function.
    // Cast to any to avoid TypeScript constructor typing issues for this JS module.
    const rec: GestureRecognizer = new GestureRecognizer(); // TODO pass in { defaultStrokes: false }
    rec.add("N", [
        [0, 0],
        [0, 1],
        [.25, .75],
        [0.5, 0.5],
        [.75, .25],
        [1, 0],
        [1, 1],
    ].map(([x, y]) => ({ x: x, y: y })));

    //      const points2 = Array.from({ length: 400 }, () => [
    //   Math.floor(Math.random() * 4097),
    //   Math.floor(Math.random() * 4097)
    // ]);


    // Convert [x,y] tuples into the recognizer's expected point objects { X, Y, ID }.
    // Use ID = 1 for a single stroke.
    const qPoints = points.map(([x, y]) => ({ x: x, y: y }));

    const start = performance.now();
    const result = rec.recognize(qPoints, true);
    const end = performance.now();
    return { type: result, elapsedMs: end - start };
}
// ...existing code...

if (true) {
    console.log('first', detect([
        [0, 0],
        [0, 1],
        [.25, .75],
        [0.5, 0.5],
        [.75, .25],
        [1, 0],
        [1, 1],
    ]))
}
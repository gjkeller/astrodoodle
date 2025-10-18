import DollarRecognizer, { Point, DollarRecognizerOptions, DollarResult } from './dollar';
import type { TimedPoint } from './tracker';

type GestureDefinition = {
    name: string;
    points: [number, number][];
};

let recognizerInstance: DollarRecognizer | null = null;

const defaultGestures: GestureDefinition[] = [
    {
        name: "N",
        points: [
            [0, 0],
            [0, 1],
            [.25, .75],
            [0.5, 0.5],
            [.75, .25],
            [1, 0],
            [1, 1],
        ],
    },
];

export function initializeRecognizer(
    gestures: GestureDefinition[] = defaultGestures,
    options: DollarRecognizerOptions = { defaultStrokes: true }
) {
    recognizerInstance = new DollarRecognizer(options);
    for (const gesture of gestures) {
        recognizerInstance.AddGesture(
            gesture.name,
            gesture.points.map(([x, y]) => new Point(x, y))
        );
    }
    return recognizerInstance;
}

function getRecognizer() {
    if (!recognizerInstance) {
        initializeRecognizer();
    }
    return recognizerInstance!;
}


export function detect(points: TimedPoint[]): DollarResult | null {
    const recognizer = getRecognizer();

    // Convert [x,y] tuples into Point instances expected by DollarRecognizer.
    const qPoints = points.map(([x, y, _]) => new Point(x, y));

    const useProtractor = true;
    const result = recognizer.Recognize(qPoints, useProtractor);
    if (!result || result.Score <= 0) {
        return null;
    }

    return result.Score > 7 ? result : null;
}
// ...existing code...
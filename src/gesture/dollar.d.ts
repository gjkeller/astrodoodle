export interface DollarRecognizerOptions {
    defaultStrokes?: boolean;
}

export class Point {
    constructor(x: number, y: number);
    X: number;
    Y: number;
}

export interface DollarResult {
    Name: string;
    Score: number;
    Time: number;
}

declare class DollarRecognizer {
    constructor(options?: DollarRecognizerOptions);
    Recognize(points: Point[], useProtractor?: boolean): DollarResult;
    AddGesture(name: string, points: Point[]): number;
    DeleteUserGestures(): number;
}

export default DollarRecognizer;

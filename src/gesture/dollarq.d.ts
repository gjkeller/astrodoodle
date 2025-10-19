export class Point {
    constructor(x: number, y: number, id?: number);
    X: number;
    Y: number;
    ID: number;
    IntX: number;
    IntY: number;
}

export interface Result {
    Name: string;
    Score: number;
    Time: number;
}

export interface PointCloud {
    Name: string;
    Points: Point[];
    LUT: number[][];
}

export declare class PDollarPlusRecognizer {
    PointClouds: PointCloud[];
    Recognize(points: Point[]): QDollarResult;
    AddGesture(name: string, points: Point[]): number;
    DeleteUserGestures(): number;
}

export default QDollarRecognizer;
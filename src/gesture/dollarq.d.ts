declare module './dollarq.js' {
    export default class QDollarRecognizer {
        constructor();
        recognize(points: { x: number; y: number }[]): { name: string; score: number } | null;
    }
}

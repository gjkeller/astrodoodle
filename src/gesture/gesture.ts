import { PDollarPlusRecognizer, Result, Point } from './dollarq';
import type { TimedPoint } from './tracker';

let recognizerInstance: PDollarPlusRecognizer | null = null;

export function initializeRecognizer() {
    if (recognizerInstance) {
        return recognizerInstance;
    }

    recognizerInstance = new PDollarPlusRecognizer();

    recognizerInstance.AddGesture("triangle", new Array(new Point(137,139),new Point(135,141),new Point(133,144),new Point(132,146),new Point(130,149),new Point(128,151),new Point(126,155),new Point(123,160),new Point(120,166),new Point(116,171),new Point(112,177),new Point(107,183),new Point(102,188),new Point(100,191),new Point(95,195),new Point(90,199),new Point(86,203),new Point(82,206),new Point(80,209),new Point(75,213),new Point(73,213),new Point(70,216),new Point(67,219),new Point(64,221),new Point(61,223),new Point(60,225),new Point(62,226),new Point(65,225),new Point(67,226),new Point(74,226),new Point(77,227),new Point(85,229),new Point(91,230),new Point(99,231),new Point(108,232),new Point(116,233),new Point(125,233),new Point(134,234),new Point(145,233),new Point(153,232),new Point(160,233),new Point(170,234),new Point(177,235),new Point(179,236),new Point(186,237),new Point(193,238),new Point(198,239),new Point(200,237),new Point(202,239),new Point(204,238),new Point(206,234),new Point(205,230),new Point(202,222),new Point(197,216),new Point(192,207),new Point(186,198),new Point(179,189),new Point(174,183),new Point(170,178),new Point(164,171),new Point(161,168),new Point(154,160),new Point(148,155),new Point(143,150),new Point(138,148),new Point(136,148)));
    recognizerInstance.AddGesture("five-point star", new Array(
        new Point(177,396,1),new Point(223,299,1),new Point(262,396,1),new Point(168,332,1),new Point(278,332,1),new Point(184,397,1)
    ));
    recognizerInstance.AddGesture("null", new Array(
        new Point(382,310,1),new Point(377,308,1),new Point(373,307,1),new Point(366,307,1),new Point(360,310,1),new Point(356,313,1),new Point(353,316,1),new Point(349,321,1),new Point(347,326,1),new Point(344,331,1),new Point(342,337,1),new Point(341,343,1),new Point(341,350,1),new Point(341,358,1),new Point(342,362,1),new Point(344,366,1),new Point(347,370,1),new Point(351,374,1),new Point(356,379,1),new Point(361,382,1),new Point(368,385,1),new Point(374,387,1),new Point(381,387,1),new Point(390,387,1),new Point(397,385,1),new Point(404,382,1),new Point(408,378,1),new Point(412,373,1),new Point(416,367,1),new Point(418,361,1),new Point(419,353,1),new Point(418,346,1),new Point(417,341,1),new Point(416,336,1),new Point(413,331,1),new Point(410,326,1),new Point(404,320,1),new Point(400,317,1),new Point(393,313,1),new Point(392,312,1),
        new Point(418,309,2),new Point(337,390,2)
    ));
    recognizerInstance.AddGesture("arrowhead", new Array(
        new Point(506,349,1),new Point(574,349,1),
        new Point(525,306,2),new Point(584,349,2),new Point(525,388,2)
    ));

    return recognizerInstance;
}

function getRecognizer() {
    if (!recognizerInstance) {
        initializeRecognizer();
    }
    return recognizerInstance!;
}


export function detect(points: TimedPoint[]): Result | null {
    const recognizer = getRecognizer();

    // Convert [x,y] tuples into Point instances expected by DollarRecognizer.
    const qPoints = points.map(([x, y]) => new Point(x, y));

    try {
        const result = recognizer.Recognize(qPoints);
        if (!result || result.Score <= 0) {
            return null;
        }

        return result.Score ? result : null;

    } catch {
        return null;
    }
}

import { BezierCurve2 } from "./BezierCurve2"

/** This class encapsulates the behavior of a Bezier curves path. If closed,
 * the path add an extra curve joininig the starting and ending curves.
 */
export class BezierPath2 {
    private _bezierCurves: BezierCurve2[]
    private _closed: boolean

    public constructor(bezierCurves: BezierCurve2[] = [], closed: boolean = false) {
        this._bezierCurves = [...bezierCurves]
        this._closed = closed
    
        if (closed) {
            const start = this._bezierCurves[0].controlPoints[0]
            const lastCurve = this._bezierCurves.slice(-1)[0] 
            const endOrder = lastCurve.order()
            const end = lastCurve.controlPoints[endOrder]

            this.addCurve(new BezierCurve2([end, start]))
        }
    }

    /**
     * Getters and setters
    */
    get length() {
        return this._bezierCurves.length
    }

    public getSegment(index: number): BezierCurve2 {
        if (index < 0 || index >= this._bezierCurves.length) {
            throw Error("Index out of bounds")
        }

        return this._bezierCurves[index]
    }

    public addCurve(bezierCurve: BezierCurve2) {
        this._bezierCurves.push(bezierCurve)
    }
    
}
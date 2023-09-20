
import {BezierPath2} from "../geometry/BezierPath2"
import { BezierCurve2Draw } from "./BezierCurve2Draw"

/** Canvas class to draw a BezierPath2 object */
export class BezierPath2Draw {
    private _bezierPath: BezierPath2
  
    public constructor(bezierPath: BezierPath2) {
        this._bezierPath = bezierPath
    }

    get bezierPath() {
        return this._bezierPath
    }
    
    public draw(context: CanvasRenderingContext2D, highlighted: number) {
        const nPaths = this._bezierPath.length

        for (let i=0;i<nPaths; i+=1) {
            const curve = this._bezierPath.getSegment(i)
            const highlight = i === highlighted
            new BezierCurve2Draw(curve).draw(context, highlight)
        }

    }
  
  }

import {BezierCurve2} from "../geometry/BezierCurve2"
import {Point2} from "../geometry/Point2"
import { drawDot, DOT_STYLE } from "./utils"

export class BezierCurve2Draw {
    private bezierCurve: BezierCurve2
    private _steps
  
    public constructor(bezierCurve: BezierCurve2, steps: number = 50) {
        this.bezierCurve = bezierCurve
        this._steps = steps
    }
    
    public draw(context: CanvasRenderingContext2D, highlight: boolean = false) {
        context.save()
        this.bezierCurve.controlPoints.forEach((controlPoint: Point2) => {
            const {x, y} = controlPoint.position
            drawDot(context, x, y, DOT_STYLE.square, 5,'#ff8000')
        })

        const p0 = this.bezierCurve.controlPoints[0]
        context.strokeStyle = highlight ? "red" : "black"
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(p0.position.x, p0.position.y)
        for (let step=1; step<=this._steps; step+=1) {
            const t = step / this._steps
            const {x, y} = this.bezierCurve.eval(t).position
            context.lineTo(x, y)
        }

        context.stroke()
        context.restore()

    }
  
  }
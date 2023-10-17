import { Point2 } from "./Point2"
import { BINOMIAL_COEFF, EPSILON } from "../utils"

/** This class encapsulates the behavior of a Bezier Curve. The class
 * allows linear, quadratic and cubic cruves.
 */
export class BezierCurve2 {
    private _controlPoints: Point2[]

    public constructor(points: Point2[]) {
        if (points.length < 2 || points.length > 4) {
            throw new Error("Invalid number of control points. They should be from 2 (lineal) to 4 (cubic).")
        }
        this._controlPoints = [...points]
    }

    /**
     * Getter and setters
    */
    get controlPoints(): Point2[] {
        return this._controlPoints
    }

    /**
     * Method that evaluates a curve position using the Bernstein polynomials
     * https://en.wikipedia.org/wiki/Bernstein_polynomial
    */
    public eval(t: number): Point2 {
        const degree = this.order()
        let returnPoint = new Point2

        for(let v=0; v<=degree; v+=1) {
            const coeff = BINOMIAL_COEFF[degree][v]
            const binomial = Math.pow((1 - t), degree - v) * Math.pow(t, v)
            returnPoint = returnPoint.sum(this._controlPoints[v].scalarMul(coeff * binomial))
        }

        return returnPoint
    }

    /**
     * Method that returns the curve order
    */
    public order(): number {
        return this._controlPoints.length - 1
    }

    public length(numSegments: number = 100): number {
        let length = 0;
        let lastPoint = this.eval(0);
    
        for (let i = 1; i <= numSegments; i++) {
            const t = i / numSegments;
            const point = this.eval(t);
            length += lastPoint.distance(point);
            lastPoint = point;
        }
    
        return length;
    }
    

    /**
     * Method that converts any Bezier curve into a linear one
    */
    public straight(): void {
        this._controlPoints = [
            this._controlPoints[0],
            this._controlPoints.slice(-1)[0]
        ]
    }

    /**
     * Method that given a 2D position, returns its collision with
     * a control point if any
    */
    public getControlPoint(x: number, y: number) : Point2 | null {
        const other = new Point2(x, y)

        for (const point of this._controlPoints) {
            if (point.distance(other) < EPSILON) {
                return point
            }            
        }
        return null
    }
    
    scale(scaleFactor:number) {
        const center = this.calculateCenter();
        this.controlPoints.forEach((point) => {
          const dx = point.position.x - center.x;
          const dy = point.position.y - center.y;
          point.position.x = center.x + dx * scaleFactor;
          point.position.y = center.y + dy * scaleFactor;
        });
      }
    
      // Calcula el centro de la curva
      calculateCenter() {
        let centerX = 0;
        let centerY = 0;
        this.controlPoints.forEach((point) => {
          centerX += point.position.x;
          centerY += point.position.y;
        });
        centerX /= this.controlPoints.length;
        centerY /= this.controlPoints.length;
        return { x: centerX, y: centerY };
      }

      public distanceToPoint(point: Point2): number {
        let minDistance = Number.MAX_VALUE;
    
        // Aproximar la curva de Bezier mediante segmentos de línea
        const numSegments = 100; // Número de segmentos para la discretización
        let lastPoint = this.eval(0);
    
        for (let i = 1; i <= numSegments; i++) {
            const t = i / numSegments;
            const currentPoint = this.eval(t);
            const distance = point.distance(currentPoint);
    
            if (distance < minDistance) {
                minDistance = distance;
            }
    
            lastPoint = currentPoint;
        }
    
        return minDistance;
    }
    
}
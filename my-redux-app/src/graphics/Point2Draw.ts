
import { Point2 } from "../geometry";
import { drawDot, DOT_STYLE } from "./utils";

/** Canvas class to draw a Point2 object */
export class Point2Draw {
  private _point: Point2;

  public constructor(point: Point2) {
    this._point = point;
  }

  get point2() {
    return this._point;
  }

  public draw(context: CanvasRenderingContext2D) {
    const { x, y } = this._point.position;
    drawDot(context, x, y, DOT_STYLE.circle);
  }

  // Implementación de serialización personalizada
  toJSON() {
    return {
      _point: {
        position: {
          x: this._point.position.x,
          y: this._point.position.y,
        },
      },
    };
  }
}

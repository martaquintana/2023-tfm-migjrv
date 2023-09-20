interface Vector2 {
    x: number,
    y: number
}

/** This class encapsulates the behavior of a 2D point */
export class Point2 {
    private p: Vector2

    public constructor(x: number = 0, y:number = 0) {
        this.p = {x, y}
    }

    get position(): Vector2 {
        return this.p
    }

    public scalarMul(n: number): Point2 {
        return new Point2(this.p.x * n, this.p.y * n)
    }

    public sum(other: Point2): Point2 {
        return new Point2(this.p.x + other.p.x, this.p.y + other.p.y)
    }

    public distance(other: Point2): number {
        const dx = this.p.x - other.p.x
        const dy = this.p.y - other.p.y
        return Math.sqrt(dx*dx + dy*dy)
    }
}
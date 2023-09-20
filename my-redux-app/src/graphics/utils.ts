

export enum DOT_STYLE {
    circle,
    square
}

export const drawDot = (context: CanvasRenderingContext2D, x: number, y: number, style: DOT_STYLE, size: number = 5): void => {
    context.save()
    context.fillStyle = '#2596be'
    context.lineWidth = 2
    context.translate(x, y)
    context.beginPath()
    if (style === DOT_STYLE.circle) {
        context.arc(-5, -5, size, 0, 2 * Math.PI)
    } else {
        context.rect(-size, -size, size, size)
    }
    context.fill()
    context.stroke()
    context.restore()
}




export enum DOT_STYLE {
    circle,
    square
}




export const drawDot = (context: CanvasRenderingContext2D, x: number, y: number, style: DOT_STYLE, size: number = 1, fillStyle:string ='#2596be'): void => {
    context.save();

    // Asegúrate de que el estilo de relleno y trazo se configuren antes de transformar el contexto
    context.fillStyle = fillStyle;
    context.strokeStyle = fillStyle;
    context.lineWidth = 2;

    // Translate el contexto al punto (x, y)
    context.translate(x, y);

    // Dibuja el punto
    context.beginPath();
    if (style === DOT_STYLE.circle) {
        context.arc(0, 0, size, 0, 2 * Math.PI);
    } else {
        context.rect(-size / 2, -size / 2, size, size);
    }
    context.fill();
    context.stroke();

    context.restore();
};

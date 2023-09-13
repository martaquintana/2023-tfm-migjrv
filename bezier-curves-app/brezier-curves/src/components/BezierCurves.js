import React, {userEffect, useRef, useEffect, useState} from 'react';

function BezierCurves() {
    const canvasRef = useRef(null);
    const canvasWidth = 500;
    const canvasHeight = 200;
    // Define los puntos inicial y final como estado local (fijos)
    const [startPoint, setControlStartPoint] = useState({ x: 100, y: 100 });
    const [endPoint, setControlEndPoint] = useState({ x: 350, y: 100 });

    // Inicializa los puntos de control como estado local
    const [controlPoint1, setControlPoint1] = useState({ x: 200, y: 100 });
    const [controlPoint2, setControlPoint2] = useState({ x: 300, y: 100 });


    const steps = 50;

    //cubicBezierInterpolation
    function cubicBezierInterpolation(p0, p1, p2, p3, t) {
        const term1 = Math.pow(1 - t, 3);
        const term2 = 3 * Math.pow(1 - t, 2) * t;
        const term3 = 3 * (1 - t) * Math.pow(t, 2);
        const term4 = Math.pow(t, 3);

        const x = term1 * p0.x + term2 * p1.x + term3 * p2.x + term4 * p3.x;
        const y = term1 * p0.y + term2 * p1.y + term3 * p2.y + term4 * p3.y;

        return { x, y };
    }

    function cubicBezierInterpolation(p0, p1, p2, p3, t) {
        const term1 = Math.pow(1 - t, 3);
        const term2 = 3 * Math.pow(1 - t, 2) * t;
        const term3 = 3 * (1 - t) * Math.pow(t, 2);
        const term4 = Math.pow(t, 3);

        const x = term1 * p0.x + term2 * p1.x + term3 * p2.x + term4 * p3.x;
        const y = term1 * p0.y + term2 * p1.y + term3 * p2.y + term4 * p3.y;

        return { x, y };
    }

    function drawBezierCurve(ctx, p0, p1, p2, p3, steps) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const point = cubicBezierInterpolation(p0, p1, p2, p3, t);
            ctx.lineTo(point.x, point.y);
        }

        ctx.stroke();
    }
    // Función para dibujar la curva de Bezier en el canvas
    const updateBezierCurve = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        //Con el calculo de las curvas de bezier por defecto de Canvas 2D API
        //ctx.beginPath();
        //ctx.moveTo(startPoint.x, startPoint.y);
        //ctx.bezierCurveTo(controlPoint1.x, controlPoint1.y, controlPoint2.x, controlPoint2.y, endPoint.x, endPoint.y);

        //Haciendo el calculo manual
        drawBezierCurve(ctx,startPoint, controlPoint1, controlPoint2, endPoint, steps);

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dibuja los puntos
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, 4, 0, Math.PI * 2);
        ctx.fillText(["[" + startPoint.x + "," + startPoint.y + "]"], startPoint.x-22, startPoint.y - 5);
        ctx.fill();
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 4, 0, Math.PI * 2);
        ctx.fillText(["[" + endPoint.x + "," + endPoint.y + "]"], endPoint.x - 22, endPoint.y - 5);

        ctx.fill();

        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(controlPoint1.x, controlPoint1.y, 4, 0, Math.PI * 2);
        ctx.fillText(["[" + controlPoint1.x + "," + controlPoint1.y + "]"], controlPoint1.x - 22, controlPoint1.y - 5);
        ctx.fill();

        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(controlPoint2.x, controlPoint2.y, 4, 0, Math.PI * 2);
        ctx.fillText(["[" + controlPoint2.x + "," + controlPoint2.y + "]"], controlPoint2.x - 22, controlPoint2.y - 5);
        ctx.fill();
    };

    // useEffect para dibujar la curva cada vez que cambie algún estado relevante
    useEffect(() => {
        updateBezierCurve();
    }, [startPoint, endPoint, controlPoint1, controlPoint2]);

    // Evento para actualizar los puntos de control mediante sliders
    const handleControlPointChange = (pointNumber, newValue) => {
        if (pointNumber === 1) {
            setControlStartPoint({ ...startPoint, x: newValue });
        } else if (pointNumber === 2) {
            setControlEndPoint({ ...endPoint, x: newValue });
        } else if (pointNumber === 3) {
            setControlStartPoint({ ...startPoint, y: newValue });
        } else if (pointNumber === 4) {
            setControlEndPoint({ ...endPoint, y: newValue });
        } else if (pointNumber === 5) {
            setControlPoint1({ ...controlPoint1, x: newValue });
        } else if (pointNumber === 6) {
            setControlPoint2({ ...controlPoint2, x: newValue });
        } else if (pointNumber === 7) {
            setControlPoint1({ ...controlPoint1, y: newValue });
        } else if (pointNumber === 8) {
            setControlPoint2({ ...controlPoint2, y: newValue });
        }
    };

    return (
        <div>
            <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                style={{ border: '1px solid black', marginTop:'100px' }}
            />
            {/* Sliders para controlar los puntos inicial y final */}
            <div style={{ marginTop: '20px' }}>
                <label>Punto Start:</label>
                <input
                    type="range"
                    min={0}
                    max={canvasWidth}
                    value={startPoint.x}
                    onChange={(e) => handleControlPointChange(1, parseInt(e.target.value))}
                />
                <input
                    type="range"
                    min={0}
                    max={canvasHeight}
                    value={startPoint.y}
                    onChange={(e) => handleControlPointChange(3, parseInt(e.target.value))}
                />
            </div>
            <div>
                <label>Punto End:</label>
                <input
                    type="range"
                    min={0}
                    max={canvasWidth}
                    value={endPoint.x}
                    onChange={(e) => handleControlPointChange(2, parseInt(e.target.value))}
                />
                <input
                    type="range"
                    min={0}
                    max={canvasHeight}
                    value={endPoint.y}
                    onChange={(e) => handleControlPointChange(4, parseInt(e.target.value))}
                />
            </div>

            {/* Sliders para controlar los puntos de control */}
            <div style={{ marginTop: '20px' }}>
                <label>Punto de Control 1:</label>
                <input
                    type="range"
                    min={0}
                    max={canvasWidth}
                    value={controlPoint1.x}
                    onChange={(e) => handleControlPointChange(5, parseInt(e.target.value))}
                />
                <input
                    type="range"
                    min={0}
                    max={canvasHeight}
                    value={controlPoint1.y}
                    onChange={(e) => handleControlPointChange(7, parseInt(e.target.value))}
                />
            </div>
            <div>
                <label>Punto de Control 2:</label>
                <input
                    type="range"
                    min={0}
                    max={canvasWidth}
                    value={controlPoint2.x}
                    onChange={(e) => handleControlPointChange(6, parseInt(e.target.value))}
                />
                <input
                    type="range"
                    min={0}
                    max={canvasHeight}
                    value={controlPoint2.y}
                    onChange={(e) => handleControlPointChange(8, parseInt(e.target.value))}
                />
            </div>
        </div>
    );
}

export default BezierCurves;



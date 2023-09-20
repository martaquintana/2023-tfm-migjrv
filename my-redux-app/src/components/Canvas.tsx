// Canvas.tsx
import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { addPoint, clearCanvas } from '../features/drawing/drawingSlice';
import { setControlPoints } from '../features/bezierCurve/bezierCurveSlice';

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dispatch = useDispatch();
  const points = useSelector((state: RootState) => state.drawing.points);
  const controlPoints = useSelector((state: RootState) => state.bezierCurve.controlPoints);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log(controlPoints)
      if (controlPoints.length < 4) {
        dispatch(addPoint({ x, y }));
        if (controlPoints.length === 3) {
          dispatch(setControlPoints([...controlPoints, { x, y }]));
        }
      }    }
  };

  const handleClearCanvas = () => {
    dispatch(clearCanvas());
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'blue';
        points.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
        console.log(points)
        console.log(controlPoints)

        // Dibujar curva de Bézier
        if (controlPoints.length === 4) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
            ctx.bezierCurveTo(
                    controlPoints[1].x,
                    controlPoints[1].y,
                    controlPoints[2].x,
                    controlPoints[2].y,
                    controlPoints[3].x,
                    controlPoints[3].y
                );
            ctx.stroke();
        }
      }
    }
  }, [points, controlPoints]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        style={{ border: '1px solid black' }}
      />
      <button onClick={handleClearCanvas}>Limpiar Canvas</button>
    </div>
  );
};

export default Canvas;

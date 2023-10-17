// FittingCanvas.tsx
import React, { useRef, useState, useEffect } from 'react';
import {
    Point2,
    BezierPath2,
    BezierCurve2,
  } from '../geometry';
  
  import {
    Point2Draw,
    BezierPath2Draw,
  } from '../graphics';

/** Context parameters */
let width = 1280
let height = 520
let context: CanvasRenderingContext2D

/** Graphical objects */
let controlPointToEdit: Point2 | null



let bezierPathDraws: BezierPath2Draw[] = [];

let HIGHLIGHTED_PATH: number = 0 //
/** State constants */
enum STATE {
    ADD,
    EDIT
}
let HIGHLIGHTED: number = 0
let CURRENT_ACTION: STATE = STATE.ADD


  
const FittingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  var [userControlPoints, setUserControlPoints] = useState<Point2Draw[]>([]);
  const [fittingBezierPath, setFittingBezierPath] = useState<BezierPath2 | null>(null);


  const handleClearCanvas = () => {
    setUserControlPoints([]);
    bezierPathDraws=[];
  };
  
  function gameLoop() {
    requestAnimationFrame(gameLoop);
    context.fillStyle = 'white';
    context.strokeStyle = 'black';
    context.fillRect(0, 0, width, height);
    context.strokeRect(0, 0, width, height);
  
    // Draw control points
   
    userControlPoints.forEach((point: Point2Draw) => {
        point.draw(context);
      });
  
    // Draw Bezier paths
    bezierPathDraws.forEach((path: BezierPath2Draw, pathIndex: number) => {
      if (pathIndex === HIGHLIGHTED_PATH) {
        path.draw(context, HIGHLIGHTED);
      } else {
        path.draw(context, -1);
      }
    });
    
    if (fittingBezierPath) {
        const fittingBezierPathDraw = new BezierPath2Draw(fittingBezierPath);
        fittingBezierPathDraw.draw(context, -1);
      }
      
  
  }
  function controlPointClicked(x: number, y: number): Point2 | null {
    if (bezierPathDraws[HIGHLIGHTED_PATH] === undefined || bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.length === 0) {
        return null
    }
    const bezierCurve = bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.getSegment(HIGHLIGHTED)
    return bezierCurve.getControlPoint(x, y)
}

function checkPointClicked(x: number, y: number) {
    // Radio de tolerancia para considerar que se ha hecho clic en un punto de control
    const tolerance = 5; // Ajusta este valor según tus necesidades

    // Itera a través de los caminos
    for (let i = 0; i < bezierPathDraws.length; i++) {        
        // Itera a través de los puntos de control en cada camino
        for (let j = 0; j < bezierPathDraws[i].bezierPath.length; j++) {
            for (let k = 0; k < bezierPathDraws[i].bezierPath.getSegment(j).controlPoints.length; k++) {        

                const controlPoint = bezierPathDraws[i].bezierPath.getSegment(j).controlPoints[k];
                
                // Calcula la distancia entre la posición del ratón y el punto de control
                const distance = Math.sqrt((x - controlPoint.position.x) ** 2 + (y - controlPoint.position.y) ** 2);
                
                // Si la distancia está dentro del radio de tolerancia, se considera que se ha hecho clic en el punto de control
                if (distance <= tolerance) {
                    return { pathIndex: i, curveIndex: j, controlPointIndex:k };
                }
            }
        }
    }

    // Si no se ha encontrado ningún punto de control cercano, devuelve null
    return null;
}
  
  
const handleCanvasMouseDown = (event: MouseEvent) => {
    // Tu lógica para el evento de mouse "mousedown"
    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        var {x, y, button} = event
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
        if (button === 0 ) { // left click
    
            // Check control points edition
            controlPointToEdit = controlPointClicked(x, y)
            
            if (controlPointToEdit !== null) {
                CURRENT_ACTION = STATE.EDIT
            }
        }
    }
  };

  const handleCanvasMouseMove = (event: MouseEvent) => {
    
    // Tu lógica para el evento de mouse "mousemove"
    if (controlPointToEdit === null) return 
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            var {x, y, button} = event
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
        if (CURRENT_ACTION === STATE.EDIT) {
            const dx = x - controlPointToEdit.position.x; // Calcula la diferencia en x
            const dy = y - controlPointToEdit.position.y; // Calcula la diferencia en y
    
            controlPointToEdit.position.x = x; // Actualiza el punto de control principal
            controlPointToEdit.position.y = y;
        
        }
        }
  };

  

  const handleCanvasMouseUp = (event: MouseEvent) => {
    // Tu lógica para el evento de mouse "mouseup"
    // Early skip
    if (CURRENT_ACTION === STATE.EDIT){
        CURRENT_ACTION = STATE.ADD
        const bezierCurve = bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.getSegment(HIGHLIGHTED).controlPoints
        bezierCurve.forEach(p => {
            console.log(p)
        })

        return
    }

    // Add always the new control point
    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        var {x, y, button} = event
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
        // Agrega el nuevo punto de control a userControlPoints
        const p = new Point2(x, y);
        const pDraw = new Point2Draw(p); // Convertirlo a Point2Draw

        setUserControlPoints((prevPoints) => [...prevPoints, pDraw]);
        
        console.log(userControlPoints)
    }
  };

  function ComputeUnitTangent(points:Point2[], index:number) {
    if (index < 0 || index >= points.length) {
        throw new Error("Índice fuera de rango.");
    }

    const currentPoint = points[index];
    let tangent;

    if (index === 0) {
        // Calcular el vector entre el primer y segundo punto (extremo inicial)
        const nextPoint = points[index + 1];
        tangent = {
            x: nextPoint.position.x - currentPoint.position.x,
            y: nextPoint.position.y - currentPoint.position.y
        };
    } else if (index === points.length - 1) {
        // Calcular el vector entre el último y penúltimo punto (extremo final)
        const prevPoint = points[index - 1];
        tangent = {
            x: prevPoint.position.x - currentPoint.position.x,
            y: prevPoint.position.y - currentPoint.position.y,
        };
    } else {
        // Para puntos intermedios, puedes calcular el promedio de los vectores tangentes en los dos extremos
        const nextPoint = points[index + 1];
        const prevPoint = points[index - 1];
        tangent = {
            x: 0.5 * (nextPoint.position.x - prevPoint.position.x),
            y: 0.5 * (nextPoint.position.y - prevPoint.position.y)
        };
    }

    // Normaliza el vector tangente para obtener un vector tangente unitario
    const length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);

    if (length === 0) {
        return { x: 0, y: 0 }; // Evitar la división por cero
    }

    const unitTangent = {
        x: tangent.x / length,
        y: tangent.y / length
    };

    return unitTangent;
}

function FitCubic(points:Point2[], tangentStart:{x: number; y: number;}, tangentEnd:{x: number; y: number;}, errorThreshold:number) {
    const maxIterations = 500; // Número máximo de iteraciones permitidas
    const newBezierPath = new BezierPath2(); // Crear un nuevo BezierPath2

    // Implementa el ajuste de una curva cúbica de Bezier a los puntos digitizados
    // utilizando los vectores tangentes en los extremos y el umbral de error.

    // Calcula la parametrización de longitud de cuerda de los puntos digitizados.
    const chordLengths = ComputeChordLengths(points);
    console.log(chordLengths)
    // Ajusta una curva cúbica de Bezier inicial a los puntos digitizados.
    let bezierCurve = FitCubicBezier(points, chordLengths, tangentStart, tangentEnd);
    console.log(bezierCurve)

    // Calcula la distancia máxima desde los puntos a la curva de Bezier inicial.
    let maxError = ComputeMaxError(points, bezierCurve);
    console.log(maxError)

    // Si el error es menor que el umbral, dibuja la curva de Bezier y termina.
    if (maxError < errorThreshold) {
        newBezierPath.addCurve(bezierCurve);
        bezierPathDraws.push(new BezierPath2Draw(newBezierPath));
        return newBezierPath;
        }

    let i = 0;

    // Itera hasta que se cumpla el umbral de error o se alcance el número máximo de iteraciones.
    while (i < maxIterations) {
        // Reparametriza los puntos según la curva de Bezier actual.
        const reparameterizedPoints = Reparameterize(points, bezierCurve);

        // Ajusta una nueva curva de Bezier a los puntos reparametrizados.
        bezierCurve = FitCubicBezier(points, chordLengths, tangentStart, tangentEnd);

        // Calcula la distancia máxima desde los puntos a la nueva curva de Bezier.
        maxError = ComputeMaxError(points, bezierCurve);

        // Si el error es menor que el umbral, dibuja la curva de Bezier y termina.
        if (maxError < errorThreshold) {
            const newBezierPath = new BezierPath2(); // Crear un nuevo BezierPath2
            newBezierPath.addCurve(bezierCurve);
            bezierPathDraws.push(new BezierPath2Draw(newBezierPath));
            console.log(newBezierPath)
            return newBezierPath;
        }

        i++;
    }

    
    // Si no se cumplió el umbral de error en las iteraciones anteriores, 
    // calcula el punto de máxima discrepancia y divide la curva en dos partes.
    const maxErrorPoint = FindMaxErrorPoint(points, bezierCurve);
    const leftPoints = points.slice(0, maxErrorPoint+1);
    const rightPoints = points.slice(maxErrorPoint);

    // Calcula los vectores tangentes en los extremos de las partes divididas.
    const leftTangent = ComputeUnitTangent(leftPoints, 0);
    const rightTangent = ComputeUnitTangent(rightPoints, rightPoints.length - 1);

    // Llama recursivamente a FitCubic en las dos partes divididas.
    FitCubic(leftPoints, leftTangent, tangentEnd, errorThreshold);
    FitCubic(rightPoints, tangentStart, rightTangent, errorThreshold);
    
    return newBezierPath;
}

function ComputeChordLengths(points:Point2[]) {
    // Calcula las longitudes de cuerda entre los puntos digitizados.
    // Devuelve un arreglo de longitudes de cuerda.
    const chordLengths = [];

    for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1];
        const currentPoint = points[i];
        const chordLength = Math.sqrt(Math.pow(currentPoint.position.x - prevPoint.position.x, 2) + Math.pow(currentPoint.position.y - prevPoint.position.y, 2));
        chordLengths.push(chordLength);
    }
    return chordLengths;
}



function FitCubicBezier(points: Point2[], chordLengths: number[], tangentStart: { x: number; y: number; }, tangentEnd: { x: number; y: number; }): BezierCurve2 {
    // Ajusta una curva cúbica de Bezier inicial a los puntos digitizados utilizando
    // la parametrización de longitud de cuerda y los vectores tangentes en los extremos.
    const numPoints = points.length;

    // Calcula la distancia total de la curva.
    const totalLength = chordLengths.reduce((acc, length) => acc + length, 0);

    // Calcula los puntos de control internos utilizando la parametrización de longitud de cuerda.
    const a1 = totalLength / 3.0;
    const a2 = totalLength / 3.0;

    const controlPoint1 = new Point2(
        points[0].position.x + tangentStart.x * a1,
        points[0].position.y + tangentStart.y * a1
    );
    
    const controlPoint2 = new Point2(
        points[numPoints - 1].position.x + tangentEnd.x * a2,
        points[numPoints - 1].position.y + tangentEnd.y * a2
    );
    

    // Crea una instancia de BezierCurve2 con los puntos de control calculados.
    const bezierCurve = new BezierCurve2([
        points[0], // Punto de inicio
        controlPoint1, // Punto de control interno 1
        controlPoint2, // Punto de control interno 2
        points[numPoints - 1] // Punto final
    ]);

    return bezierCurve;
}


function ComputeMaxError(points:Point2[], bezierCurve:BezierCurve2) {
    // Calcula la distancia máxima desde los puntos a la curva de Bezier.
    // Devuelve el valor máximo de error.

    let maxError = 0;

    for (const point of points) {
        const error = bezierCurve.distanceToPoint(point);
        maxError = Math.max(maxError, error);
    }
    return maxError;
}

function Reparameterize(points: Point2[], bezierCurve: BezierCurve2): number[] {
    // Calcula la longitud total de la curva de Bézier actual
    const totalLength = bezierCurve.length();

    // Inicializa un arreglo para almacenar los nuevos parámetros
    const reparameterizedPoints: number[] = [];

    let accumulatedLength = 0;

    for (let i = 0; i < points.length; i++) {
        // Calcula la longitud acumulativa desde el punto de inicio de la curva de Bézier hasta el punto actual
        accumulatedLength += bezierCurve.eval(i / (points.length - 1)).distance(bezierCurve.eval((i + 1) / (points.length - 1)));

        // Normaliza la longitud acumulativa y almacena el nuevo parámetro en el arreglo
        const param = accumulatedLength / totalLength;
        reparameterizedPoints.push(param);
    }

    return reparameterizedPoints;
}



function FindMaxErrorPoint(points: Point2[], bezierCurve: BezierCurve2): number {
    let maxError = -1; // Inicializa el valor máximo de error como negativo
    let maxErrorPointIndex = -1; // Inicializa el índice del punto de máxima discrepancia como negativo

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const curvePoint = bezierCurve.eval(i / (points.length - 1)); // Evalúa la curva en un punto equidistante

        const error = point.distance(curvePoint);

        if (error > maxError) {
            maxError = error;
            maxErrorPointIndex = i;
        }
    }

    return maxErrorPointIndex;
}

function FitCurve(d:Point2[], e:number) {
    // Compute unit tangent vectors at the ends of the digitized points
    let t1 = ComputeUnitTangent(d, 0);
    let t2 = ComputeUnitTangent(d, d.length - 1);
    
    console.log(t1,t2)
    // Call FitCubic with computed tangents and user-specified error
    setFittingBezierPath(FitCubic(d, t1, t2, e));
    console.log(fittingBezierPath)
}

  const handleKeyUp = (event: KeyboardEvent) => {

        // Tu lógica para el evento de teclado "keyup"

        switch (event.key) {
            case "ArrowLeft":
                HIGHLIGHTED -= 1;
                break;
            case "ArrowRight":
                HIGHLIGHTED += 1;
                break;
            case "ArrowUp":
                HIGHLIGHTED_PATH -= 1;
                HIGHLIGHTED = 0; // Restablecer la curva seleccionada al cambiar de camino
                break;
            case "ArrowDown":
                HIGHLIGHTED_PATH += 1;
                HIGHLIGHTED = 0; // Restablecer la curva seleccionada al cambiar de camino
                break;
            case "l":
                if(bezierPathDraws.length !== 0){
                    const lengthSelectedCurve = bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.getSegment(HIGHLIGHTED).length();
                    const lengthDisplay = document.getElementById("lengthDisplay");
                    if (lengthDisplay !== null) {
                        lengthDisplay.textContent = `Longitud estimada de la curva: ${lengthSelectedCurve}`;
                    }
                }
                break;
            case "Enter":
                // Calcula la curva de Bezier ajustada y almacénala en fittingBezierPath
                if (userControlPoints.length >= 2) {
                    const controlPoints = userControlPoints.map((point) => point.point2);
                    const e=10;
                    FitCurve(controlPoints, e)
                }
                break;
            case "e":
                if(bezierPathDraws.length !== 0){
                    bezierPathDraws[0].bezierPath.getSegment(0).scale(1.2);

                    // Escala la segunda curva en bezierPathDraws[1]
                    bezierPathDraws[1].bezierPath.getSegment(0).scale(1.2);
                }
                break;
            case "m":
                if(bezierPathDraws.length !== 0){
                    bezierPathDraws[0].bezierPath.getSegment(0).scale(0.8);
                    // Escala la segunda curva en bezierPathDraws[1]
                    bezierPathDraws[1].bezierPath.getSegment(0).scale(0.8);
                }
                break;
            case " ":
                bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.getSegment(HIGHLIGHTED).straight();
                break;
        }
    if(bezierPathDraws.length !== 0){

        const nPaths = bezierPathDraws.length;
        HIGHLIGHTED_PATH = (HIGHLIGHTED_PATH % nPaths + nPaths) % nPaths;

        const nCurves = bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.length;
        HIGHLIGHTED = (HIGHLIGHTED % nCurves + nCurves) % nCurves;
        event.preventDefault();
    };
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
    context = canvas.getContext("2d") as CanvasRenderingContext2D
        if (context) {
            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            gameLoop();

        }
        // Manejar eventos de mouse 
        canvas.addEventListener('mousedown', handleCanvasMouseDown);
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
        canvas.addEventListener('mouseup', handleCanvasMouseUp);
        window.addEventListener('keyup', handleKeyUp);

        // Limpieza de eventos al desmontar el componente
        return () => {
        canvas.removeEventListener('mousedown', handleCanvasMouseDown);
        canvas.removeEventListener('mousemove', handleCanvasMouseMove);
        canvas.removeEventListener('mouseup', handleCanvasMouseUp);
        window.removeEventListener('keyup', handleKeyUp);
    };
    }
    

  }, [userControlPoints,fittingBezierPath]);

  return (

    <div>
        <div style={{ margin: '5px' }}>
            <button onClick={handleClearCanvas}>Limpiar Canvas</button>
            <span id="lengthDisplay" style={{ marginLeft: '20px' }}>Longitud estimada de la curva: </span>
        </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ border: '1px solid black' }}
      />

    </div>
  );
};

export default FittingCanvas;

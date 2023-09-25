// Canvas.tsx
import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { addPoint, clearCanvas } from '../features/drawing/drawingSlice';
import { setControlPoints } from '../features/bezierCurve/bezierCurveSlice';

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
let canvas: HTMLCanvasElement
let context: CanvasRenderingContext2D

/** Graphical objects */
let controlPointToEdit: Point2 | null
let controlPoints: Point2Draw[] = []
let controlPoints2: Point2Draw[] = []

const bezierPath: BezierPath2 = new BezierPath2
let bezierPathDraw: BezierPath2Draw = new BezierPath2Draw(bezierPath)

let bezierPathDraws: BezierPath2Draw[] = [];

let HIGHLIGHTED_PATH: number = 0 //
let linked=false;
let linkedControlPoints: String[]=[];
/** State constants */
enum STATE {
    ADD,
    EDIT
}
let HIGHLIGHTED: number = 0
let CURRENT_ACTION: STATE = STATE.ADD
let creatingNewPath = false;


  
const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dispatch = useDispatch();

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log(controlPoints.length )
        dispatch(addPoint({ x, y }));
        if (controlPoints.length <= 3) {
          //dispatch(setControlPoints([...controlPoints, { x, y }]));
        }
      }   
  };

  const handleClearCanvas = () => {
    dispatch(clearCanvas());
    controlPoints = [];
    controlPoints2 = [];
    bezierPathDraws=[];
  };
  
  function gameLoop() {
    requestAnimationFrame(gameLoop);
    context.fillStyle = 'white';
    context.strokeStyle = 'black';
    context.fillRect(0, 0, width, height);
    context.strokeRect(0, 0, width, height);
  
    // Draw control points
    controlPoints.forEach((point: Point2Draw) => {
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
  
  }
  function controlPointClicked(x: number, y: number): Point2 | null {
    if (bezierPathDraws[HIGHLIGHTED_PATH] == undefined || bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.length === 0) {
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
        
            let controlPointEdited= checkPointClicked(x, y)

            if(linked && controlPointEdited ){

                    // Itera a través de las asociaciones y actualiza los puntos de control vinculados
                for (const association of linkedControlPoints) {
                    const [source, target] = association.split(":");
                    const sourcePathIndex = parseInt(source[0]);
                    const sourceCurveIndex = parseInt(source[1]);
                    const sourceControlPointIndex = parseInt(source[2]);
                    const targetPathIndex = parseInt(target[0]);
                    const targetCurveIndex = parseInt(target[1]);
                    const targetControlPointIndex = parseInt(target[2]);

                    // Si el punto de control principal pertenece a la asociación, actualiza el punto de control vinculado
                    if (
                        sourcePathIndex === controlPointEdited.pathIndex &&
                        sourceCurveIndex === controlPointEdited.curveIndex &&
                        sourceControlPointIndex === controlPointEdited.controlPointIndex
                    ) {
                        const linkedBezierPath = bezierPathDraws[targetPathIndex].bezierPath.getSegment(targetCurveIndex);
                        const linkedControlPoint = linkedBezierPath.controlPoints[targetControlPointIndex];

                        // Actualiza la posición del punto de control vinculado
                        linkedControlPoint.position.x += dx;
                        linkedControlPoint.position.y += dy;
                    }
                }
            }
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
    console.log(HIGHLIGHTED_PATH);
    console.log(HIGHLIGHTED);
    // Add always the new control point
    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        var {x, y, button} = event
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    const p = new Point2(x, y)
    controlPoints.push(
        new Point2Draw(p)
    )
    const p2 = new Point2(x+100, y)

    controlPoints2.push(
        new Point2Draw(p2)
    )

    if (button === 2 ) { // right click
        const points = controlPoints.map((point: Point2Draw) => point.point2)
        const points2 = controlPoints2.map((point: Point2Draw) => point.point2)

        try {
            const bezierCurve = new BezierCurve2(points)
            const bezierCurve2 = new BezierCurve2(points2)

            if (creatingNewPath || bezierPathDraws.length === 0) {
                const newBezierPath = new BezierPath2(); // Crear un nuevo BezierPath2
                newBezierPath.addCurve(bezierCurve);
                bezierPathDraws.push(new BezierPath2Draw(newBezierPath));
                const newBezierPath2 = new BezierPath2(); // Crear un nuevo BezierPath2
                newBezierPath2.addCurve(bezierCurve2);
                bezierPathDraws.push(new BezierPath2Draw(newBezierPath2));
                creatingNewPath = false; // Restablecer creatingNewPath
            } else {
                // Agregar la curva al último BezierPath2
                bezierPathDraws[bezierPathDraws.length - 2].bezierPath.addCurve(bezierCurve);
                bezierPathDraws[bezierPathDraws.length - 1].bezierPath.addCurve(bezierCurve2);

            }
            console.log(bezierPathDraws)

            controlPoints = controlPoints.slice(-1)
            controlPoints2 = controlPoints2.slice(-1)

        } catch (e) {
            if (e instanceof Error) {
                // Get the initial control point
                controlPoints = [controlPoints[0]]
                console.log(e.message)
            }
        }
    }
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if(bezierPathDraws.length !== 0){

        // Tu lógica para el evento de teclado "keyup"
        if (event.key === "+") { // Presionar la tecla "2" para activar la creación de un nuevo Bezier Path
            creatingNewPath = true;
            controlPoints = []; // Limpiar la lista de puntos de control
            console.log("Creando un nuevo Bezier Path");
        }
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
            case "2":
                console.log("Vincular puntos de control")
                // Arreglo para mantener los puntos de control vinculados
                linkedControlPoints=[];

                const pathIndexA = 0;
                const pathIndexB = 1;
                for (let i = 0; i < bezierPathDraws[pathIndexA].bezierPath.length; i++) {

                    const curveA = bezierPathDraws[pathIndexA].bezierPath.getSegment(0);
                    const curveB = bezierPathDraws[pathIndexB].bezierPath.getSegment(0);
                
                
                    // Asumimos que ambas curvas tienen la misma cantidad de puntos de control
                    const numControlPoints = Math.min(curveA.controlPoints.length, curveB.controlPoints.length);
                
                    for (let j = 0; j < numControlPoints; j++) {
                    linkedControlPoints.push(`${pathIndexA}${i}${j}:${pathIndexB}${i}${j}`);
                    }
                }

                console.log(linkedControlPoints);
                
                linked=true;
            break
            case " ":
                bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.getSegment(HIGHLIGHTED).straight();
                break;
        }
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
    

  }, [controlPoints]);

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
        onClick={handleCanvasClick}
        style={{ border: '1px solid black' }}
      />

    </div>
  );
};

export default Canvas;

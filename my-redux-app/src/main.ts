import { 
    Point2, 
    BezierPath2, 
    BezierCurve2
} from './geometry'

import { 
    Point2Draw,
    BezierPath2Draw,
} from './graphics'

/** Context parameters */
let width = 1280
let height = 720
let canvas: HTMLCanvasElement
let context: CanvasRenderingContext2D

/** Graphical objects */
let controlPointToEdit: Point2 | null
let controlPoints: Point2Draw[] = []
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

/** Auxiliary functions */
function gameLoop() {
    requestAnimationFrame(gameLoop)
    context.fillStyle = "white"
    context.strokeStyle = "black"
    context.fillRect(0, 0, width, height)
    context.strokeRect(0, 0, width, height)

    controlPoints.forEach((point: Point2Draw) => {
        point.draw(context)
    })

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

function eventListeners() {

    canvas.onmousedown = (ev: MouseEvent) => {
        const {x, y, button} = ev
        if (button === 0 ) { // left click
    
            // Check control points edition
            controlPointToEdit = controlPointClicked(x, y)
            
            if (controlPointToEdit !== null) {
                CURRENT_ACTION = STATE.EDIT
            }
        }
    }
    
    canvas.onmousemove = (ev: MouseEvent) => {
        if (controlPointToEdit === null) return 
        const {x, y} = ev
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
    
    canvas.onmouseup = (ev: MouseEvent) => {
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
        const {x, y, button} = ev
        const p = new Point2(x, y)
        controlPoints.push(
            new Point2Draw(p)
        )
        
        if (button === 2 ) { // right click
            const points = controlPoints.map((point: Point2Draw) => point.point2)
    
            try {
                const bezierCurve = new BezierCurve2(points)
                if (creatingNewPath || bezierPathDraws.length === 0) {
                    const newBezierPath = new BezierPath2(); // Crear un nuevo BezierPath2
                    newBezierPath.addCurve(bezierCurve);
                    bezierPathDraws.push(new BezierPath2Draw(newBezierPath));
                    creatingNewPath = false; // Restablecer creatingNewPath
                } else {
                    // Agregar la curva al último BezierPath2
                    bezierPathDraws[bezierPathDraws.length - 1].bezierPath.addCurve(bezierCurve);
                }
                console.log(bezierPathDraws)

                controlPoints = controlPoints.slice(-1)
            } catch (e) {
                if (e instanceof Error) {
                    // Get the initial control point
                    controlPoints = [controlPoints[0]]
                    console.log(e.message)
                }
            }
        }

    }
    
    window.onkeyup = (ev: KeyboardEvent) => {
        if (ev.key === "+") { // Presionar la tecla "2" para activar la creación de un nuevo Bezier Path
            creatingNewPath = true;
            controlPoints = []; // Limpiar la lista de puntos de control
            console.log("Creando un nuevo Bezier Path");
        }
        switch (ev.key) {
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
                const lengthSelectedCurve = bezierPathDraws[HIGHLIGHTED_PATH].bezierPath.getSegment(HIGHLIGHTED).length();
                const lengthDisplay = document.getElementById("lengthDisplay");
                if (lengthDisplay !== null) {
                    lengthDisplay.textContent = `Longitud estimada de la curva: ${lengthSelectedCurve}`;
                }
                break;
            case "2":
                console.log("Vincular puntos de control")
                // Arreglo para mantener los puntos de control vinculados

                linkedControlPoints = [
                    "000:100", // Asociación entre Path 0, Curve 0, Punto de control 0 y Path 1, Curve 0, Punto de control 0
                    "001:101", // Asociación entre Path 0, Curve 0, Punto de control 1 y Path 1, Curve 0, Punto de control 1
                    "002:102", // Asociación entre Path 0, Curve 0, Punto de control 2 y Path 1, Curve 0, Punto de control 2
                ];
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
        ev.preventDefault();
    }
}


window.onload = () => {
    let container = document.createElement('div')
    container.id = "container"

    canvas = document.createElement('canvas')
    canvas.id = "bezier_editor"
    canvas.width = width
    canvas.height = height
    container.appendChild(canvas)
    document.body.appendChild(container)
    context = canvas.getContext("2d") as CanvasRenderingContext2D
    document.addEventListener('contextmenu', ev => ev.preventDefault())

    const lengthDisplay = document.createElement('p');
    lengthDisplay.id="lengthDisplay"
    lengthDisplay.textContent = `Longitud estimada de la curva: `;
    document.body.appendChild(lengthDisplay);
    if (context === null) {
        throw Error("Context badly constructed!")
    }

    eventListeners()
    gameLoop()

}
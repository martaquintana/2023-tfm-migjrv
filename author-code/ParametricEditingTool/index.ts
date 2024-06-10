import { isHotkeyPressed } from 'react-hotkeys-hook';
import { Key } from 'ts-key-enum';

import { MeasurementSystem, units, SCALES } from '@seddi/core';
import { BezierPointType, Path2 } from '@seddi/geometry';
import {
  Garment,
  ISceneEntity,
  PIECE_LINE_TYPES_INTERIOR,
  PIECE_LINE_TYPES_SHAPE,
} from '@seddi/scene';
import { PointerFrame } from '@seddi/ui-viewport-core';
import {
  Camera2,
  ColliderTypes,
  IShape,
  PiecesCollider,
  PiecesLinesCollider,
  PiecesPointsCollider,
  Viewport2,
  Viewport2Props,
  CenterLinesShapesBuilder,
} from '@seddi/ui-canvas-viewer';

import { Cursors } from 'Components';
import { FeatureState } from '@/reducers/features';
import { ViewStyle } from '@/actions/Scene';
import { TOOLS } from '@/constants';
import { IPathNodesSelection } from '@/Scene/PathNodesSelection/types';
import { SceneEditionMode } from '@/Scene';
import { IControlPointState } from '@/Scene/ControlPointState';
import { MixpanelManager } from '@/Tracking/mixpanelManager';

import { HoverBehaviour } from './HoverBehaviour';
import { SelectBehaviour } from './SelectBehaviour';
import { MoveBehaviour } from './MoveBehaviour/MoveNodesBehaviour';
import { PathsLabelsShapesBuilder } from '../shapesBuilders/PathsLabelsShapesBuilder';
import { VectorEditionShapesBuilder } from '../shapesBuilders/VectorEditionShapesBuilder';
import {
  ToolBehaviourId,
  PatternState,
  OnAnimationTickArgs,
  ToolOptions,
  NodeTransformFn,
} from '../types';
import { ConvertPointBehaviour } from './ConvertPointBehaviour';
import { Commands, ShowContextualMenu } from '../commonBehaviors';
import { SumSegmentsBehaviour } from './SumSegmentsBehaviour';
import { AddPointBehaviour } from '../CreationTool/EditPointsBehaviours/AddPointBehaviour';
import { RemovePointBehaviour } from '../CreationTool/EditPointsBehaviours/RemovePointBehaviour';
import { HoverControlPointsBehaviour } from './ControlPointBehaviours/Hover';
import { SelectControlPointsBehaviour } from './ControlPointBehaviours/Select';
import { ToggleBeziersBehaviour } from './ControlPointBehaviours/ToggleBeziersBehaviour';
import { MoveControlPointsBehaviour } from './MoveBehaviour/MoveControlPointsBehaviour';
import { PieceEditionModeBehaviour } from './PieceEditionModeBehaviour';
import { PointStyle } from '../shapesBuilders/VectorEditionShapesBuilder/styles';
import { PathNodeSelectionBuilderUtils } from '../shapesBuilders/VectorEditionShapesBuilder/PathNodeSelectionBuilderUtils';
import { PathNodesSelection } from '@/Scene/PathNodesSelection';
import { SegmentLabelUtils } from '../utils/SegmentLabelUtils';
import { TransformRT2, Vector2 } from '@seddi/math-v2';
import { MathTmp } from '../../math';
import { ISceneAppWithPoms } from '@/parametricEditor';

export class ParametricEditingTool {
  actions: any;
  theme: any;
  colliders: any;
  selection: IPathNodesSelection[];
  scene: any;
  disabled: boolean;
  hover: IPathNodesSelection;
  showContextualMenuBehaviour: ShowContextualMenu;
  addPointBehaviour: AddPointBehaviour;
  hoverBehaviour: HoverBehaviour;
  hoverControlPointsBehaviour: HoverControlPointsBehaviour;
  selectBehaviour: SelectBehaviour;
  convertPointBehaviour: ConvertPointBehaviour;
  sumSegmentsBehaviour: SumSegmentsBehaviour;
  moveBehaviour: MoveBehaviour;
  removePointBehaviour: RemovePointBehaviour;
  vectorEditionShapesBuilder: VectorEditionShapesBuilder;
  pathsLabelsShapesBuilder: PathsLabelsShapesBuilder;
  centerLinesShapesBuilder: CenterLinesShapesBuilder;
  pieces: ISceneEntity[];
  state: any;
  behaviourStates: Map<ToolBehaviourId, any>;
  shapes: IShape[];
  unitSystem: MeasurementSystem;
  viewport: Viewport2<Viewport2Props>;
  camera: Camera2;
  id: string;
  toggleBeziersBehaviour: ToggleBeziersBehaviour;
  controlPointState: IControlPointState;
  pathNodeSelectionBuilderUtils: PathNodeSelectionBuilderUtils;

  selectControlPointsBehaviour: SelectControlPointsBehaviour;
  moveControlPointsBehaviour: MoveControlPointsBehaviour;
  needsUpdate: boolean;
  editionMode: SceneEditionMode;
  pieceEditionModeBehaviour: PieceEditionModeBehaviour;
  featureFlags: FeatureState;
  constructor({
    camera,
    viewport,
    actions,
    theme,
    unitSystem,
    scene,
    editionMode,
    selection,
    featureFlags,
  }: ToolOptions) {
    this.camera = camera;
    this.viewport = viewport;
    this.id = TOOLS.PARAMETRIC_EDITION;
    this.disabled = false;
    this.showContextualMenuBehaviour = new ShowContextualMenu();
    this.hoverBehaviour = new HoverBehaviour();
    this.selectBehaviour = new SelectBehaviour();
    this.hoverControlPointsBehaviour = new HoverControlPointsBehaviour();
    this.selectControlPointsBehaviour = new SelectControlPointsBehaviour();
    this.toggleBeziersBehaviour = new ToggleBeziersBehaviour(this.showContextualMenuBehaviour);
    this.moveControlPointsBehaviour = new MoveControlPointsBehaviour();
    this.convertPointBehaviour = new ConvertPointBehaviour(this.showContextualMenuBehaviour);
    this.addPointBehaviour = new AddPointBehaviour(
      [Commands.ContextualMenu],
      this.showContextualMenuBehaviour,
    );
    this.removePointBehaviour = new RemovePointBehaviour(
      [Commands.Delete, Commands.ContextualMenu],
      this.showContextualMenuBehaviour,
    );
    this.sumSegmentsBehaviour = new SumSegmentsBehaviour();
    this.moveBehaviour = new MoveBehaviour(unitSystem);
    this.pieceEditionModeBehaviour = new PieceEditionModeBehaviour(
      this.showContextualMenuBehaviour,
    );
    this.actions = actions;
    this.theme = theme;
    this.colliders = new Map();
    this.behaviourStates = new Map();
    this.vectorEditionShapesBuilder = new VectorEditionShapesBuilder(this.theme);
    this.pathsLabelsShapesBuilder = new PathsLabelsShapesBuilder(this.theme);
    this.centerLinesShapesBuilder = new CenterLinesShapesBuilder();
    this.pathNodeSelectionBuilderUtils = new PathNodeSelectionBuilderUtils(this.theme);
    this.unitSystem = unitSystem;

    this.onUpdate({
      camera,
      viewport,
      actions,
      scene,
      selection,
    });
    this.shapes = [];
    this.needsUpdate = false;
    this.editionMode = editionMode;
    this.featureFlags = featureFlags;
    MixpanelManager.pushTrackEvent('Select parametric editing tool');
  }

  onUpdate(updateArgs: Partial<ToolOptions>) {
    const { state, editionMode, entities } = updateArgs;
    const scene = updateArgs.scene as ISceneAppWithPoms;

    if (state?.id && this.id !== state?.id) return;
    const selectionChanged = this.selection !== state?.selection;
    //console.log("ONUPDATE")
    const sceneChanged = this.scene !== scene;
    const hoverChanged = this.hover !== state?.hover;
    const editionModeChanged = this.editionMode !== editionMode;
    const controlPointChanged = this.controlPointState !== state?.controlPoint;
    const pieces = scene ? Garment.Pieces(scene) : [];
    const pomsChanged = this.scene?.pointsOfMeasure !== scene?.pointsOfMeasure;
    this.updateToolState(pieces, updateArgs);

    if (this.pieces.length === 0) this.pieces = pieces;
    console.log(this.scene?.pointsOfMeasure !== scene?.pointsOfMeasure);

    if (pomsChanged) {
      this.needsUpdate = true;
      console.log(this.scene.pointsOfMeasure, scene.pointsOfMeasure);
      this.ParametricEditing(this.scene);
    }

    if (
      sceneChanged ||
      selectionChanged ||
      hoverChanged ||
      editionModeChanged ||
      controlPointChanged
    ) {
      this.needsUpdate = true;
      this.updateColliders(this.pieces, entities);
      this.updateShapeBuilders(this.pieces, editionMode);
    }
  }

  private updateToolState(pieces: ISceneEntity[], updateArgs: Partial<ToolOptions>) {
    const { scene, state, editionMode, selection, viewStyle } = updateArgs;

    this.pieces = pieces.filter(
      ({ _id }) => !(this.editionMode === SceneEditionMode.Piece) || _id === selection[0],
    );
    this.disabled = viewStyle === ViewStyle.TrueSeamsGl;
    this.controlPointState = state?.controlPoint;
    this.hover = state?.hover;
    this.scene = scene;
    this.selection = state?.selection || [];
    this.editionMode = editionMode;
  }

  private updateColliders(pieces: ISceneEntity[], entities: any) {
    const collidersLineTypes =
      this.editionMode === SceneEditionMode.Piece
        ? PIECE_LINE_TYPES_INTERIOR
        : PIECE_LINE_TYPES_SHAPE;

    const piecesLinesCollider = new PiecesLinesCollider(pieces, {
      breakAtSharpNodes: true,
      patternEditingTool: true,
      breakAtLinePoints: true,
      lineTypes: collidersLineTypes,
    });
    const controlPointsLinesCollider = [
      new PiecesPointsCollider(pieces, BezierPointType.Control1, collidersLineTypes),
      new PiecesPointsCollider(pieces, BezierPointType.Control2, collidersLineTypes),
    ];
    this.colliders.set(ColliderTypes.PiecesControlPoints, controlPointsLinesCollider);
    const pointsLinesCollider = new PiecesPointsCollider(
      pieces,
      BezierPointType.Node,
      collidersLineTypes,
    );
    const piecesCollider = new PiecesCollider(entities);
    this.colliders.set(ColliderTypes.PiecesLines, piecesLinesCollider);
    this.colliders.set(ColliderTypes.PiecesPoints, pointsLinesCollider);
    this.colliders.set(ColliderTypes.Pieces, piecesCollider);
  }

  private updateShapeBuilders(pieces: ISceneEntity[], editionMode: SceneEditionMode) {
    const { unitSystem, scene } = this;
    //console.log(pieces)
    //console.log(this.hover)
    //console.log(this.selection)
    //console.log(this.controlPointState)
    //console.log(editionMode);
    this.vectorEditionShapesBuilder.onUpdate({
      pieces: pieces,
      hover: this.hover,
      selection: this.selection,
      controlPointState: this.controlPointState,
      editionMode,
    });

    this.pathsLabelsShapesBuilder.onUpdate({
      pieces,
      unitSystem,
      selection: this.selection,
      editionMode,
    });

    this.centerLinesShapesBuilder.onUpdate({
      pieces,
    });
  }

  onAnimationTick(inputArgs: OnAnimationTickArgs) {
    const {
      hover,
      colliders,
      camera: { scale },
      actions,
      selection,
      pieces,
      scene,
      controlPointState,
      editionMode,
    } = this;
    const { pointer } = inputArgs;

    const toolState: PatternState = {
      actions,
      colliders,
      hover,
      pieces,
      pointer,
      scale,
      scene,
      selection,
      controlPointState,
      editionMode,
    };

    this.executeBehaviors(toolState, pointer);
    this.updateToolShapes(toolState);
    if (pointer.primaryDrag) {
      const nodesData = PathNodesSelection.getSelectedNodesData(selection, pieces);
      //console.log(nodesData);
      //const selectedPiece = pieces.find(({ _id }) => nodesData[0].pieceID == _id);

      //if (selectedPiece) {
      //  const message = `Moviendo hacia abajo: ${selectedPiece.name}`;
      //  console.log(message);
      //}
    }

    if (isHotkeyPressed(Key.Escape) && this.editionMode === SceneEditionMode.Piece) {
      this.setPatternMode();
    }
    this.setCursor(toolState);
    const update = this.needsUpdate;
    this.needsUpdate = false;
    return update;
  }

  private setPatternMode() {
    this.actions.setEditionMode(SceneEditionMode.Pattern);
  }

  private executeBehaviors(toolState: PatternState, pointer: PointerFrame) {
    const { selection, actions, disabled, scene } = this;
    let newSelection = [...selection];

    if (this.isSelectHoverInput(pointer)) {
      this.hoverControlPointsBehaviour.execute(toolState);

      this.controlPointState?.hover
        ? this.hoverBehaviour.reset(actions)
        : this.hoverBehaviour.execute(toolState);

      this.selectControlPointsBehaviour.execute(toolState);
      // Allow select behaviour for secondary down to exit the selection of control points
      if (!this.selectControlPointsBehaviour.state.select || pointer.secondaryDown) {
        this.selectBehaviour.execute(toolState);
      }

      newSelection = this.selectBehaviour.state.selection;
    }
    //console.log(newSelection)
    //optener longitud del path
    //let segmentPath=new Path2(store.getState().scene.data.children[4].components.garmentPiece.interiorLines[0].path);
    //segmentPath.path=store.getState().scene.data.children[4].components.garmentPiece.sewLine.path;
    //console.log(segmentPath)
    //const resultado = Number(SegmentLabelUtils.GetPathLength(segmentPath, this.unitSystem, 1, SCALES.m)) /2;

    //console.log(resultado)
    //this.actions.updateSliderValue(resultado);
    /*let poms = store.getState().parametricData.pointsOfMeasure;
      const firstSetOfPOM = poms[0].POM;
      let combinedPOM = firstSetOfPOM;
      
      if (poms[1] && poms[1].POM) {
        // Obtén los puntos de medida del segundo conjunto
        const secondSetOfPOM = poms[1].POM;
      
        // Combina los dos conjuntos de puntos de medida
        combinedPOM = firstSetOfPOM.concat(secondSetOfPOM);
      }*/

    // Ahora, `combinedPOM` tiene todos los elementos de ambos conjuntos
    // Úsalo como necesites

    const updatedToolState = {
      ...toolState,
      selection: newSelection,
      //selection: p1,
      featureFlags: this.featureFlags,
      poms: scene.pointsOfMeasure,
    };
    //this.moveBehaviour.execute(updatedToolState, disabled);

    /*
    // Passing the disabled state down to these behaviours because we need to show alerts when they get triggered first
    this.moveControlPointsBehaviour.execute(updatedToolState, disabled);
    !this.moveControlPointsBehaviour.isDragging &&
      this.moveBehaviour.execute(updatedToolState, disabled);
    if (disabled && updatedToolState.pointer.secondaryDown) {
      actions.addInstantNotification(I18n.t(`FidelityState.editAlert`));
    }
    // prevent rest of the editing operations
    if (disabled) return;
    this.showContextualMenuBehaviour.reset();
    this.pieceEditionModeBehaviour.execute(updatedToolState);
    this.convertPointBehaviour.execute(updatedToolState);
    this.toggleBeziersBehaviour.execute(toolState);
    this.addPointBehaviour.execute(updatedToolState);
    this.removePointBehaviour.execute(updatedToolState);*/
  }

  private isSelectHoverInput(pointer: PointerFrame) {
    const { selection } = this;
    return (
      pointer.primaryDragDown ||
      pointer.secondaryDown ||
      (pointer.hover && !(this.moveBehaviour.isDragging && selection.length))
    );
  }

  private setCursor(toolState: PatternState) {
    const { selection } = this;
    const { cursor: moveControlPointsCursor } = this.moveControlPointsBehaviour.state;
    const cursor: any = {
      image: moveControlPointsCursor || Cursors.PATTERN_EDITION,
    };

    if (selection.length > 0) {
      const length = this.sumSegmentsBehaviour.execute(toolState);

      if (length > 0) {
        const label = `${units.translateToUserUnits(
          this.unitSystem,
          SCALES.m,
          length,
          0,
        )} ${units.obtainShortUnits(this.unitSystem, SCALES.m)}`;

        cursor.label = label;
      }
    }

    this.viewport.setCursor(cursor);
  }

  private updateToolShapes(toolState: PatternState) {
    const { editionMode, pieces } = toolState;

    this.behaviourStates.set(this.selectBehaviour.id, this.selectBehaviour.state);
    this.behaviourStates.set(this.moveBehaviour.id, this.moveBehaviour.state);
    this.behaviourStates.set(
      this.moveControlPointsBehaviour.id,
      this.moveControlPointsBehaviour.state,
    );
    !this.moveControlPointsBehaviour.state.isDragging &&
      this.behaviourStates.set(this.moveBehaviour.id, this.moveBehaviour.state);

    this.shapes = [
      ...this.pathsLabelsShapesBuilder.getShapes(this.behaviourStates, this.unitSystem),
      ...this.centerLinesShapesBuilder.getShapes(),
    ];

    const isEditingPiece = editionMode === SceneEditionMode.Piece;
    if (isEditingPiece && pieces?.length > 0) {
      this.shapes.push(
        ...this.pathNodeSelectionBuilderUtils.getNodesShapesFromPieces({
          pieces: [pieces[0]] as ISceneEntity[],
          style: PointStyle.Blocked(this.theme),
          editionMode: this.editionMode,
          lineTypes: PIECE_LINE_TYPES_SHAPE,
        }),
      );
    }

    this.shapes.push(...this.vectorEditionShapesBuilder.getShapes(this.behaviourStates));
  }

  private readonly transform: TransformRT2 = TransformRT2.Zero();
  private readonly transform2: TransformRT2 = TransformRT2.Zero();
  private readonly transform3: TransformRT2 = TransformRT2.Zero();

  private ParametricEditing(scene: ISceneAppWithPoms) {
    const poms = scene.pointsOfMeasure;
    const { transform, transform2, transform3 } = this;
    if (poms) {
      for (let i = 0; i < poms.length; i++) {
        const garmentPieceObject = scene.children.find(
          (entity) => entity._id === poms[i].garmentPieceId,
        );
        const interiorLineObject = garmentPieceObject.components.garmentPiece.interiorLines.find(
          (line) => line._id === poms[i].interiorLineId,
        );
        if (garmentPieceObject && interiorLineObject) {
          const segmentPath = new Path2(interiorLineObject.path);
          const resultado =
            Number(SegmentLabelUtils.GetPathLength(segmentPath, this.unitSystem, 1, SCALES.m)) / 2;
          const longitudActual = resultado;
          const longitudDeseada = poms[i].sliderValue;
          const diferenciaLongitud = longitudActual - longitudDeseada;
          const proporcion = longitudDeseada / longitudActual;

          console.log(diferenciaLongitud);
          if (diferenciaLongitud != 0) {
            // Factor de conversión
            const factorConversion = 0.01; // Este valor debe ajustarse según tus necesidades
            //let orientation= this.determineLineOrientation(segmentPath, garmentPieceObject.components.transform2D )

            const [transformNodesFn, transformNodesFn2] = this.calcularTransformacion(
              poms[i].orientation,
              factorConversion,
              diferenciaLongitud,
              garmentPieceObject,
              transform,
              transform2,
              segmentPath,
            );
            if (poms[i].orientation == 0 || poms[i].orientation == 2) {
              //Horizontales muevo los 2 poms
              this.actions.updatePathNodes(poms[i].POM[0], transformNodesFn); //MOVERSELECCION CON EL SLIDER
              this.actions.updatePathNodes(poms[i].POM[1], transformNodesFn2); //MOVERSELECCION CON EL SLIDER
            } else if (poms[i].orientation == 1) {
              //Verticales solo muevo el ultimo
              this.actions.updatePathNodes(poms[i].POM[1], transformNodesFn2); //MOVERSELECCION CON EL SLIDER
            }

            if (poms[i].gradding) {
              console.log(poms[i].POM[0]);
              const select = [
                {
                  nodes: {
                    holeLines: {},
                    interiorLines: {},
                    sewLine: [0, 1],
                  },
                  piece: garmentPieceObject._id,
                },
              ];
              const select2 = [
                {
                  nodes: {
                    holeLines: {},
                    interiorLines: {},
                    sewLine: [1, 2],
                  },
                  piece: garmentPieceObject._id,
                },
              ];
              const select3 = [
                {
                  nodes: {
                    holeLines: {},
                    interiorLines: {},
                    sewLine: [6, 7],
                  },
                  piece: garmentPieceObject._id,
                },
              ];
              const select4 = [
                {
                  nodes: {
                    holeLines: {},
                    interiorLines: {},
                    sewLine: [3, 4],
                  },
                  piece: garmentPieceObject._id,
                },
              ];
              console.log(select);
              const interiorLineObject3 = garmentPieceObject.components.garmentPiece.sewLine.path;
              const segmentPath3 = new Path2(interiorLineObject3);

              const [graddingTransform] = this.calcularTransformacionStyle(
                factorConversion,
                diferenciaLongitud,
                garmentPieceObject, // Reemplazar 'any' con el tipo adecuado para la pieza de ropa
                transform3,
                segmentPath3,
              );
              this.actions.updatePathNodes(select, graddingTransform);
              //this.actions.updatePathNodes(select2, graddingTransform);
              //this.actions.updatePathNodes(select3, graddingTransform);
              //this.actions.updatePathNodes(select4, graddingTransform);
            }
            if (poms[i].connected) {
              // Busca otros POM con el mismo type
              for (let j = 0; j < poms.length; j++) {
                if (j !== i && poms[j].type === poms[i].type) {
                  const garmentPieceObject = scene.children.find(
                    (entity) => entity._id === poms[j].garmentPieceId,
                  );
                  const interiorLineObject =
                    garmentPieceObject.components.garmentPiece.interiorLines.find(
                      (line) => line._id === poms[j].interiorLineId,
                    );
                  if (garmentPieceObject && interiorLineObject) {
                    const segmentPath = new Path2(interiorLineObject.path);
                    const resultado =
                      Number(
                        SegmentLabelUtils.GetPathLength(segmentPath, this.unitSystem, 1, SCALES.m),
                      ) / 2;
                    const longitudActual = resultado;
                    const longitudDeseada = poms[j].sliderValue * proporcion;
                    const diferenciaLongitud = longitudActual - longitudDeseada;

                    const [transformNodesFn, transformNodesFn2] = this.calcularTransformacion(
                      poms[j].orientation,
                      factorConversion,
                      diferenciaLongitud,
                      garmentPieceObject,
                      transform,
                      transform2,
                      segmentPath,
                    );
                    //Asumimos que la orientacion de los conectados es la misma
                    // Realiza el mismo desplazamiento para el otro POM conectado
                    if (poms[j].orientation == 0 || poms[j].orientation == 2) {
                      //Horizontales muevo los 2 poms
                      this.actions.updatePathNodes(poms[j].POM[0], transformNodesFn);
                      this.actions.updatePathNodes(poms[j].POM[1], transformNodesFn2);
                    } else {
                      //Verticales solo muevo el ultimo
                      this.actions.updatePathNodes(poms[j].POM[1], transformNodesFn2);
                      console.log('ENTRA updatePathNodes');
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private calcularTransformacion(
    orientacion: number,
    factorConversion: number,
    diferenciaLongitud: number,
    piezaDeRopa: any, // Reemplazar 'any' con el tipo adecuado para la pieza de ropa
    transformacionInicio: TransformRT2,
    transformacionFinal: TransformRT2,
    segmentPath: any,
  ): [NodeTransformFn, NodeTransformFn] {
    let ajusteMitad: number = (factorConversion * diferenciaLongitud) / 2;

    if (orientacion === 1) {
      ajusteMitad = factorConversion * diferenciaLongitud;
    }

    let desplazamientoX: number = ajusteMitad;
    let desplazamientoY: number = ajusteMitad;

    if (orientacion === 0) {
      desplazamientoY = 0;
    } else if (orientacion === 1) {
      desplazamientoX = 0;
    } else if (orientacion === 2) {
      const p1 = this.ToLocalCoordinates(
        segmentPath.path[0].position,
        piezaDeRopa.components.transform2D,
      );
      const p2 = this.ToLocalCoordinates(
        segmentPath.path[1].position,
        piezaDeRopa.components.transform2D,
      );

      // Calcula el vector unitario en la dirección de la línea original
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Normaliza el vector de dirección
      const ux = Math.abs(dx / dist);
      const uy = dy / dist;

      // Multiplica el vector normalizado por la distancia deseada para obtener el desplazamiento

      const direccionOriginal = { x: ux, y: uy };
      // Calcula el desplazamiento en la dirección de la línea
      desplazamientoX = direccionOriginal.x * ajusteMitad;
      desplazamientoY = direccionOriginal.y * ajusteMitad;
    }

    const sliderInicio: Vector2 = MathTmp.Vector2[1];
    const sliderFinal: Vector2 = MathTmp.Vector2[1];

    const puntoInicio: Vector2 = MathTmp.Vector2[0];
    const puntoFinal: Vector2 = MathTmp.Vector2[0];

    sliderInicio.set(-desplazamientoY, -desplazamientoX);
    const transformacionSliderInicio: TransformRT2 = TransformRT2.Zero();
    puntoInicio.set(0, 0);
    transformacionInicio.setTranslation(sliderInicio.subtractInPlace(puntoInicio));
    transformacionInicio.setRotation(piezaDeRopa.components.transform2D.rotation);

    sliderFinal.set(desplazamientoY, desplazamientoX);
    const transformacionSliderFinal: TransformRT2 = TransformRT2.Zero();
    puntoFinal.set(0, 0);
    transformacionFinal.setTranslation(sliderFinal.subtractInPlace(puntoFinal));
    transformacionFinal.setRotation(piezaDeRopa.components.transform2D.rotation);

    const transformacionNodoFnInicio = this.getTransformFn(transformacionInicio);
    const transformacionNodoFnFinal = this.getTransformFn(transformacionFinal);

    console.log('Transformación Nodo Inicio:', transformacionNodoFnInicio);
    console.log('Transformación Nodo Final:', transformacionNodoFnFinal);

    return [transformacionNodoFnInicio, transformacionNodoFnFinal];
  }

  private calcularTransformacionStyle(
    factorConversion: number,
    diferenciaLongitud: number,
    piezaDeRopa: any, // Reemplazar 'any' con el tipo adecuado para la pieza de ropa
    transformacionInicio: TransformRT2,
    segmentPath: any,
  ): [NodeTransformFn] {
    const ajusteMitad = (factorConversion * diferenciaLongitud) / 2; //distancia que tiene que moverse
    let desplazamientoX = ajusteMitad;
    let desplazamientoY = ajusteMitad;
    //caluclar distancia segmento y
    const p1 = segmentPath.path[0].position;
    const p2 = segmentPath.path[1].position;

    //calcular normales
    // Calcula el vector unitario en la dirección de la normal
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Normaliza el vector de dirección
    const ux = Math.abs(dx / dist);
    const uy = dy / dist;

    // Multiplica el vector normalizado por la distancia deseada para obtener el desplazamiento

    const direccionOriginal = { x: -uy, y: ux }; //Calcular la dirección perpendicular a la que tiene el segmento que tiene que llevar el segmento
    // Calcula el desplazamiento en la dirección de la línea
    desplazamientoX = ajusteMitad;
    desplazamientoY = ajusteMitad;

    const sliderInicio: Vector2 = MathTmp.Vector2[1];

    const puntoInicio: Vector2 = MathTmp.Vector2[0];

    sliderInicio.set(-desplazamientoY, -desplazamientoX);
    puntoInicio.set(0, 0);
    transformacionInicio.setTranslation(sliderInicio.subtractInPlace(puntoInicio));
    transformacionInicio.setRotation(piezaDeRopa.components.transform2D.rotation);

    const transformacionNodoFn = this.getTransformFn(transformacionInicio);

    console.log('Transformación Nodo', transformacionNodoFn);
    console.log('TRANSFORMANDO', piezaDeRopa);

    return [transformacionNodoFn];
  }

  private ToGlobalCoordinates(
    puntoLocal: { x: number; y: number },
    transformacion: { rotation: number; translation: { x: number; y: number } },
  ): { x: number; y: number } {
    // Aplicar la rotación
    const xTemp =
      puntoLocal.x * Math.cos(transformacion.rotation) -
      puntoLocal.y * Math.sin(transformacion.rotation);
    const yTemp =
      puntoLocal.x * Math.sin(transformacion.rotation) +
      puntoLocal.y * Math.cos(transformacion.rotation);

    // Aplicar la traslación
    const xMundo = xTemp + transformacion.translation.x;
    const yMundo = yTemp + transformacion.translation.y;

    return { x: xMundo, y: yMundo };
  }

  private ToLocalCoordinates(
    globalPoint: { x: number; y: number },
    transformation: { rotation: number; translation: { x: number; y: number } },
  ): { x: number; y: number } {
    // Aplicar la traslación inversa
    const xTemp = globalPoint.x - transformation.translation.x;
    const yTemp = globalPoint.y - transformation.translation.y;

    // Aplicar la rotación inversa
    const xLocal =
      xTemp * Math.cos(-transformation.rotation) - yTemp * Math.sin(-transformation.rotation);
    const yLocal =
      xTemp * Math.sin(-transformation.rotation) + yTemp * Math.cos(-transformation.rotation);

    return { x: xLocal, y: yLocal };
  }

  private determineLineOrientation(
    line: Path2,
    transformation: { rotation: number; translation: { x: number; y: number } },
  ): number {
    // Calcular las componentes del vector dirección

    const p0 = this.ToLocalCoordinates(line.path[0].position, transformation);
    const p1 = this.ToLocalCoordinates(line.path[1].position, transformation);
    //console.log("line",p0,p1)
    /*var vx = Math.abs(Math.round(p1.x - p0.x));
  var vy = Math.abs(Math.round(p1.y - p0.y));
        
  //console.log(vx,vy,transformation.rotation)
  // Interpreta el vector dirección
  if (vx === 0 && vy === 0 || vx === 1 && vy === 1) {
      return 0;
      console.log("La recta es horizontal.");
  } else if (vx === 1 && vy === 0 || vx === 0 && vy === 1 ) {
      console.log("La recta es vertical.");  
      return 1;

  } else {
    console.log("La recta es diagonal.");
    return 2;
  }*/

    const dx = Math.abs(p0.x - p1.x);
    const dy = Math.abs(p0.y - p1.y);
    console.log('tolerance 0.05', dx, dy);
    const tolerance = 0.025; //before 0.05
    if (dx <= tolerance) {
      console.log('La recta es vertical.');
      return 1;
    } else if (dy <= tolerance) {
      console.log('La recta es horizontal.');
      return 0;
    } else {
      console.log('La recta es diagonal.');
      return 2;
    }
    //console.log(line)
    //return  Math.atan2(line.path[1].position.y - line.path[0].position.y, line.path[1].position.x - line.path[0].position.x) * (180 / Math.PI);
  }
  private getTransformFn(transform: TransformRT2) {
    const transformNodesFn: NodeTransformFn = (node, prevNode, entity) => {
      const {
        components: {
          transform2D: { rotation },
        },
      } = entity;

      // Copiar la transformación original del nodo
      const updatedNode = { ...node };
      const updatedPrevNode = { ...prevNode };

      // Aplicar la traslación local al nodo
      updatedNode.position.x += transform.translation.x;
      updatedNode.position.y += transform.translation.y;

      if (updatedNode.control1) {
        updatedNode.control1.x += transform.translation.x;
        updatedNode.control1.y += transform.translation.y;
      }
      if (updatedPrevNode.control2) {
        updatedPrevNode.control2.x += transform.translation.x;
        updatedPrevNode.control2.y += transform.translation.y;
      }

      return { node: updatedNode, prevNode: updatedPrevNode };
    };

    return transformNodesFn;
  }
}

import { isHotkeyPressed } from 'react-hotkeys-hook';
import { Key } from 'ts-key-enum';

import { MeasurementSystem, units, SCALES } from '@seddi/core';
import { BezierPointType } from '@seddi/geometry';
import {
  Garment,
  ISceneEntity,
  PIECE_LINE_TYPES_INTERIOR,
  PIECE_LINE_TYPES_SHAPE,
  PieceLineType,
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
  PieceLinesColliderHit,
  UnitCircle,
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
import { ToolBehaviourId, PatternState, OnAnimationTickArgs, ToolOptions } from '../types';
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
import { CreateBehaviour } from './CreateBehaviour';
import { Path2, PathPoint, IPathNodes2 } from '@seddi/geometry';
import { lineTolerance } from '../utils/ColliderUtils';
import { IVector2 } from '@seddi/math-v2';
import { ISceneAppWithPoms } from '@/parametricEditor';

let points: IPathNodesSelection[][] = [];
let pomPostions: { x: number; y: number }[] = [];
let sharedPointer = null;
let tolerance: number = 0.005;
let hitOffsets: { from: PathPoint; hit_t: PathPoint }[] = [];

export class PomTool {
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
  createBehaviour: CreateBehaviour;
  protected collider: PiecesLinesCollider;
  isSnapped: boolean;
  scale: number;
  punto1: any;

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
    this.id = TOOLS.POM;
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
    this.createBehaviour = new CreateBehaviour();
    points = [];
    pomPostions = [];
    sharedPointer = null;
    this.punto1 = null;

    tolerance = 0.005;
    this.scale = 0;
    hitOffsets = [];
    this.isSnapped = false;
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
    const { actions } = this;
    if (state?.id && this.id !== state?.id) return;
    const selectionChanged = this.selection !== state?.selection;

    const sceneChanged = this.scene !== scene;
    const hoverChanged = this.hover !== state?.hover;
    const editionModeChanged = this.editionMode !== editionMode;
    const controlPointChanged = this.controlPointState !== state?.controlPoint;
    const pieces = scene ? Garment.Pieces(scene) : [];

    //console.log(updateArgs)
    this.updateToolState(pieces, updateArgs);

    if (this.pieces.length === 0) this.pieces = pieces;

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
    const isDuplicate = points.some(
      (existingSelection) =>
        // You need to define your own logic to compare selections
        // This assumes that each selection is an array and uses JSON.stringify for simplicity
        JSON.stringify(existingSelection) === JSON.stringify(this.selection),
    );

    if (sceneChanged) {
      this.scene = scene;
      const pieces = Garment.Pieces(scene);
      const collider = new PiecesLinesCollider(pieces, {
        breakAtSharpNodes: true,
        lineTypes: [PieceLineType.Sew],
      });
      this.collider = collider;
    }

    // If it's not a duplicate, proceed to add the new selection
    //console.log(points)
    //console.log(this.selection)

    if (!isDuplicate && this.selection && this.selection.length > 0) {
      //console.log("Entra");
      let hit = { d: Number.MAX_VALUE } as PieceLinesColliderHit;
      let newpoint = sharedPointer.worldspace;
      if (pomPostions.length > 0) {
        const pathpos0: IPathNodes2 = [{ position: { x: pomPostions[0].x, y: pomPostions[0].y } }];
        newpoint = this.getPointWithSnap(sharedPointer.worldspace, pathpos0, 0.001); //this.scale)
        //console.log(pathpos0,newpoint)
      }

      //console.log("newPoint",newpoint)
      //console.log(this.collider)
      //console.log("tolerance",tolerance)

      hit = this.collider.cast(newpoint, hit, tolerance);
      if (!hit) {
        hit = undefined;
      }

      //console.log("HIT",hit)

      const path = new Path2(hit.line.path);
      const to = hit.segment.to;
      let from = hit.segment.from;
      if (from != undefined) {
        from.segment = hit.t.segment;
      } else {
        from = { segment: hit.t.segment, offset: 0 };
      }
      console.log(to, from);
      console.log('hit.t', hit.t);

      const path1 = path.split(from, hit.t); // Dividir desde el punto 'from' en el sentido normal

      console.log('path1', path1);

      // Agrega la nueva selección (como un array) a la matriz de puntos

      if (points.length >= 2) {
        // Remove the oldest selection (the first element in the array)
        //Borrar interior lines del ultimo punto añadido
        const poms = scene.pointsOfMeasure;

        /*if (poms){
                actions.removeInteriorLines({ids: poms[poms.length-1].interiorLineId, piece: poms[poms.length-1].garmentPieceId});
                actions.deletePointOfMeasure({index:poms.length-1})
               }*/
        points = [];
        pomPostions = [];
        hitOffsets = [];
        this.punto1 = null;
      }
      points.push(this.selection);

      const selectionPOM = scene.children.find((piece) => piece._id === this.selection[0].piece);
      const pos =
        selectionPOM.components.garmentPiece.sewLine.path[this.selection[0].nodes.sewLine[0]];
      //console.log(this.selection[0].nodes.sewLine)

      const puntoMundo = this.ToGlobalCoordinates(
        path1.path[1].position,
        selectionPOM.components.transform2D,
      );
      pomPostions.push(puntoMundo);
      hitOffsets.push({ from: from, hit_t: hit.t });
      this.punto1 = puntoMundo;

      //console.log("PASA POR AQUI");

      // Si hay al menos dos puntos, crea una nueva línea interior y agrega un punto de medida
      if (pomPostions.length >= 2) {
        // const pathpos0: IPathNodes2 = [{ position: { x: pomPostions[0].x, y: pomPostions[0].y }}];

        //let newpoint = this.getPointWithSnap(pomPostions[1],pathpos0,0.001)//this.scale)
        //console.log(pathpos0)

        //console.log(newpoint)
        const positionPOM = new Path2(
          [
            { position: { x: pomPostions[0].x, y: pomPostions[0].y } },
            { position: { x: pomPostions[1].x, y: pomPostions[1].y } },
          ],
          false,
        );

        actions.addPOMInteriorLine(
          this.selection[0].piece,
          positionPOM,
          false,
          points,
          this.unitSystem,
          hitOffsets,
        );
        this.punto1 = null;
      }
    }
    // Si no es un duplicado y hay una selección válida, procede a agregar la nueva selección
    /*if (!isDuplicate && this.selection && this.selection.length > 0) {
          console.log("Entra");
          let hit = { d: Number.MAX_VALUE } as PieceLinesColliderHit;
          hit = this.collider.cast(sharedPointer.worldspace, hit, tolerance);
      
      
          console.log("HIT",hit)
            const { lineId, piece, pieceId } = hit;
      
              const path = new Path2(hit.line.path),
              to = hit.segment.to,
              from = hit.segment.from;
              const isInversedOrder = from.segment > to.segment;
              console.log(path);

              let path1 = path.split(from, hit.t);
              console.log("path1",path1)
            
        
    
        // Agrega la nueva selección (como un array) a la matriz de puntos
          
          if (points.length >= 2) {
            // Remove the oldest selection (the first element in the array)
             //Borrar interior lines del ultimo punto añadido
             let poms = scene.pointsOfMeasure;

             if (poms){
              actions.removeInteriorLines({ids: poms[poms.length-1].interiorLineId, piece: poms[poms.length-1].garmentPieceId});
              actions.deletePointOfMeasure({index:-1})
             }
             points = [];
             pomPostions = [];
             hitOffsets = []

          }
          points.push(this.selection);

          const selectionPOM = scene.children.find((piece) => piece._id === this.selection[0].piece);
          let pos = selectionPOM.components.garmentPiece.sewLine.path[this.selection[0].nodes.sewLine[0]];
          console.log(this.selection[0].nodes.sewLine)

          const puntoMundo = this.ToGlobalCoordinates(path1.path[1].position, selectionPOM.components.transform2D);
          pomPostions.push(puntoMundo);
          hitOffsets.push({ from: from, hit_t: hit.t });

          console.log("PASA POR AQUI");
          
      
          // Si hay al menos dos puntos, crea una nueva línea interior y agrega un punto de medida
          if (pomPostions.length >= 2) {
            let positionPOM = new Path2([
              { position: { x: pomPostions[0].x, y: pomPostions[0].y } },
              { position: { x: pomPostions[1].x, y: pomPostions[1].y } }
            ], false);
            
            actions.addPOMInteriorLine(this.selection[0].piece, positionPOM, false, points,this.unitSystem,hitOffsets);

          }
        

    }*/

    //console.log(points)

    //actions.addPointOfMeasure(points,{isDrawing: false, sliderValue: 42 });
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

  private getPointWithSnap(
    pointer: { x: number; y: number },
    path: IPathNodes2,
    scale: number,
  ): IVector2 {
    //console.log(path)
    const point = {
      x: pointer.x,
      y: pointer.y,
    };
    //console.log("PETA getPointWithSnap",point,path[0].position)

    if (!path) return point;
    else {
      path.forEach(({ position }) => {
        const IsSnappingToCoordinateX = Math.abs(pointer.x - position.x) <= scale;
        const IsSnappingToCoordinateY = Math.abs(pointer.y - position.y) <= scale;

        if (IsSnappingToCoordinateX) {
          point.x = position.x;
        }
        if (IsSnappingToCoordinateY) {
          point.y = position.y;
        }
        console.log('getPointWithSnap', IsSnappingToCoordinateX, IsSnappingToCoordinateY);
      });
    }
    return point;
  }

  private getPointWithSnap2(
    pointer: { x: number; y: number },
    point2: { x: number; y: number },
    scale: number,
  ): IVector2 {
    //console.log(path)
    const point = {
      x: pointer.x,
      y: pointer.y,
    };
    //console.log("PETA getPointWithSnap",point,path[0].position)

    const IsSnappingToCoordinateX = Math.abs(pointer.x - point2.x) <= scale;
    const IsSnappingToCoordinateY = Math.abs(pointer.y - point2.y) <= scale;

    if (IsSnappingToCoordinateX) {
      point.x = point2.x;
    }
    if (IsSnappingToCoordinateY) {
      point.y = point2.y;
    }
    console.log('getPointWithSnap', IsSnappingToCoordinateX, IsSnappingToCoordinateY);

    return point;
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
      state,
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

    this.setPointerCoordinates(pointer);
    this.setTolerance(lineTolerance(scale));
    this.setScale(scale);

    this.executeBehaviors(toolState, pointer);
    this.updateToolShapes(toolState);
    this.shapes.push(...this.getPOMShapes(scene, pointer));
    this.createBehaviour.execute(toolState);
    if (pointer.primaryDrag) {
      /*let pos=new Path2([{
        position: {x:pointer.worldspace.x, y:pointer.worldspace.y}
      },{position: {x:pointer.worldspace.x+0.5, y:pointer.worldspace.y+0.5}}],false);
      actions.addInteriorLine("658009fc178b21e4485a88b5",pos,false)*/
      const nodesData = PathNodesSelection.getSelectedNodesData(selection, pieces);
      //console.log(nodesData);
      const selectedPiece = pieces.find(({ _id }) => nodesData[0].pieceID == _id);

      if (selectedPiece) {
        const message = `Moviendo hacia abajo: ${selectedPiece.name}`;
        //console.log(message);
      }
    }

    if (isHotkeyPressed(Key.Escape) && this.editionMode === SceneEditionMode.Piece) {
      this.setPatternMode();
    }
    this.setCursor(toolState);
    const update = this.needsUpdate;
    this.needsUpdate = false;
    return update;
  }
  // Set pointer coordinates from somewhere else in your code
  private setPointerCoordinates(pointer) {
    sharedPointer = pointer;
  }
  private setTolerance(pointer) {
    tolerance = pointer;
  }
  private setScale(s) {
    this.scale = s;
  }
  private setPatternMode() {
    this.actions.setEditionMode(SceneEditionMode.Pattern);
  }

  private executeBehaviors(toolState: PatternState, pointer: PointerFrame) {
    const { selection, actions, disabled } = this;
    let newSelection: IPathNodesSelection[] = [...selection];

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
      //optener longitud del path
      //let segmentPath=new Path2()
      //segmentPath.path=store.getState().scene.data.children[4].components.garmentPiece.sewLine.path;
      //console.log(segmentPath)

      //console.log(SegmentLabelUtils.GetPathLength(segmentPath, this.unitSystem, 1, SCALES.m))
    }

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
    const { editionMode, pieces, scene } = toolState;

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

  private getPOMShapes(scene: any, pointer: any) {
    const shapes = [];

    if (this.punto1) {
      const cursorSnap = this.getPointWithSnap2(pointer.worldspace, this.punto1, 0.01); //this.scale)

      const shape = new Path2D();
      shape.moveTo(this.punto1.x, this.punto1.y);
      shape.lineTo(cursorSnap.x, cursorSnap.y);

      shapes.push(
        {
          path: UnitCircle,
          position: {
            x: this.punto1.x,
            y: this.punto1.y,
          },
          scale: 7,
          fill: '#FFFFFF',
          stroke: '#ffa500',
        },
        {
          path: shape,
          stroke: '#ffa500',
          with: 2,
        },
        {
          path: UnitCircle,
          position: {
            x: cursorSnap.x,
            y: cursorSnap.y,
          },
          scale: 7,
          fill: '#ffa500',
          stroke: '#ffa500',
        },
      );
    }

    //const shapeToBuild = shape;

    // this.drawLine(segmentPath.path[0].position,null,null,shapeToBuild, segmentPath.path[1].position)

    return shapes;
  }

  private drawLine(
    point: any,
    control1: IVector2,
    control2: IVector2,
    shapeToBuild: Path2D,
    end: IVector2,
  ) {
    console.log('point,shapeToBuild,end', point, shapeToBuild, end);

    if (point.end) end = point.end;
    if (control1 && control2) {
      shapeToBuild.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y);
    } else if (control1 || control2) {
      const control = control1 || control2;
      shapeToBuild.quadraticCurveTo(control.x, control.y, end.x, end.y);
    } else {
      shapeToBuild.lineTo(end.x, end.y);
    }
  }
}

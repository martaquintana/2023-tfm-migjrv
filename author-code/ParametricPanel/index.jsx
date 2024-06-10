import PropTypes from 'prop-types';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { connect, useDispatch, useSelector, useStore } from 'react-redux';

import { MeasurementSystem, SCALES } from '@seddi/core';
import { Path2 } from '@seddi/geometry';

import {
  Actions as componentActions,
  Button,
  Input,
  InputGroup,
  Checkbox,
  RangeSlider,
} from 'Components';
import { editorSelectTool } from '@/editor/actions';
import {
  updatePathNodes,
  updatePieceGrain,
  updatePOMInteriorLines,
  removeInteriorLines,
} from '@/actions/garment';
import {
  ViewStyle,
  setTool,
  updateEntityName,
  updateCreateEntities,
  dropAvatar,
} from '@/actions/Scene';
import { updatePointOfMeasureProperty, deletePointOfMeasure } from '@/actions/pointsOfMeasure';
import { TOOLS } from '@/constants';
import { SegmentLabelUtils } from '@/components/scene/SceneViewport2/tools/utils/SegmentLabelUtils';

const ParametricPatternProperties = ({ show, scene, pointsOfMeasure }) => {
  const { dispatch, getState } = useStore();
  const [changedPomIndex, setPomIndex] = useState(0);

  const handleDeleteComponent = (pomIndex) => {
    // Copiar el array de pointsOfMeasure y eliminar el elemento en el índice pomIndex
    // Despachar la acción para actualizar pointsOfMeasure en el estado
    //console.log("dispatch borro", pointsOfMeasure[pomIndex].interiorLineId)
    console.log(
      'remove:',
      pointsOfMeasure[pomIndex].interiorLineId,
      pointsOfMeasure[pomIndex].garmentPieceId,
    );
    dispatch(
      removeInteriorLines({
        ids: pointsOfMeasure[pomIndex].interiorLineId,
        piece: pointsOfMeasure[pomIndex].garmentPieceId,
      }),
    );
    dispatch(deletePointOfMeasure(pointsOfMeasure[pomIndex]._id));
    //console.log("ESTE ES EL PROBLEMA3",pomIndex)
  };
  const handlePomIndexChange = (newIndex) => {
    setPomIndex(newIndex);
  };

  const handleUpdateSlidersComponent = (pomIndex) => {
    handleUpdateSliders(pomIndex, dispatch, scene);
  };

  useEffect(() => {
    //console.log("changedPomIndex",changedPomIndex)
    if (pointsOfMeasure && Array.isArray(pointsOfMeasure) && pointsOfMeasure.length > 0) {
      handleUpdateSliders(changedPomIndex, dispatch, scene);
    }
  }, [scene, changedPomIndex, dispatch, pointsOfMeasure]);

  const sceneData = useSelector((state) => state.scene.data);

  const handleExport = useCallback(() => {
    const avatar = sceneData.children.find((e) => Boolean(e.components.avatar));
    const avatarMesh = {
      indices: Array.from(avatar.components.mesh.mesh.geometry.indices),
      positions: Array.from(avatar.components.mesh.mesh.geometry.position),
    };
    const pieces = sceneData.children.filter((e) => Boolean(e.components.garmentPiece));
    const piecesEncoded = pieces.map((e) => {
      return {
        ...e,
        components: {
          ...e.components,
          garmentPiece: {
            ...e.components.garmentPiece,
            geometry: {
              indices: Array.from(e.components.garmentPiece.geometry.indices),
              position2D: Array.from(e.components.garmentPiece.geometry.position2D),
              position3D: Array.from(e.components.garmentPiece.geometry.position3D),
            },
            sewLine: {
              ...e.components.garmentPiece.sewLine,
              sides: e.components.garmentPiece.sewLine.sides.map((s) => ({
                ...s,
                indices: Array.from(s.indices),
              })),
            },
          },
        },
      };
    });
    const data = { avatar: avatarMesh, pieces: piecesEncoded, poms: sceneData.pointsOfMeasure };

    // TODO: Apply base64 encoding before json export to reduce json size.

    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'store_state.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sceneData]);

  const handleImport = useCallback(
    (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          // Parsear JSON.
          const importedState = JSON.parse(e.target.result);

          const piecesDecoded = importedState.pieces.map((e) => {
            return {
              ...e,
              components: {
                ...e.components,
                garmentPiece: {
                  ...e.components.garmentPiece,
                  geometry: {
                    indices: new Uint32Array(e.components.garmentPiece.geometry.indices),
                    position2D: new Float32Array(e.components.garmentPiece.geometry.position2D),
                    position3D: new Float32Array(e.components.garmentPiece.geometry.position3D),
                  },
                  sewLine: {
                    ...e.components.garmentPiece.sewLine,
                    sides: e.components.garmentPiece.sewLine.sides.map((s) => ({
                      ...s,
                      indices: new Uint32Array(s.indices),
                    })),
                  },
                },
              },
            };
          });

          // Actualizar piezas.
          const geometryResult = {
            pieces: piecesDecoded.map((e) => {
              return {
                _id: e._id,
                geometry: e.components.garmentPiece.geometry,
                sewLine: e.components.garmentPiece.sewLine,
              };
            }),
          };
          const {
            scene: { data: scene },
          } = getState();
          updateCreateEntities({ dispatch, getState, geometryResult, scene });

          // Actualizar POMs
          // dispatch(updatePOMInteriorLines());
          // dispatch(updatePOMsData(importedState));

          // Actualizar avatar.
          if (importedState.avatar.id) {
            dispatch(dropAvatar(importedState.avatar.id, false));
          }
        } catch (error) {
          console.error('Error al importar el estado:', error);
        }
      };

      // Leer archivo como texto.
      reader.readAsText(file);
    },
    [dispatch, getState],
  );

  const renderParametricPattern = () => {
    return (
      <div>
        <InputGroup name="Mesurements" hr={true}>
          {pointsOfMeasure &&
            Array.isArray(pointsOfMeasure) &&
            pointsOfMeasure.length > 0 &&
            pointsOfMeasure.map((pom, index) => (
              <SliderComponent
                key={index}
                pomIndex={index}
                initialValue={pom.sliderValue}
                scene={scene}
                onDelete={handleDeleteComponent}
                updateSliders={handleUpdateSlidersComponent}
                onPomIndexChange={handlePomIndexChange}
              />
            ))}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Button
              style={{ width: '100%' }}
              onClick={() => {
                dispatch(show(setTool(TOOLS.POM)));
                dispatch(editorSelectTool(TOOLS.POM));
              }}
            >
              Add POM
            </Button>
            <br></br>
            <Button
              style={{ width: '100%', backgroundColor: 'rgb(78, 15, 210)', color: 'white' }}
              onClick={() => {
                dispatch(show(setTool(TOOLS.PARAMETRIC_EDITION)));
                dispatch(editorSelectTool(TOOLS.PARAMETRIC_EDITION));
              }}
            >
              Save
            </Button>
          </div>

          <br></br>
        </InputGroup>
      </div>
    );
  };

  return <div>{renderParametricPattern()}</div>;
};

ParametricPatternProperties.propTypes = {
  entities: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  entity: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    components: PropTypes.object.isRequired, // TODO
  }),
  selection: PropTypes.arrayOf(PropTypes.string).isRequired,
  updateEntityName: PropTypes.func.isRequired,
  updatePieceGrain: PropTypes.func.isRequired,
  userUnitSystem: PropTypes.string,
  viewStyle: PropTypes.oneOf([ViewStyle.Render, ViewStyle.TrueSeamsGl, ViewStyle.Default]),
  children: PropTypes.arrayOf(PropTypes.object),
  updatePointOfMeasureProperty: PropTypes.func.isRequired,
  deletePointOfMeasure: PropTypes.func.isRequired,
  removeInteriorLines: PropTypes.func.isRequired,
};
ParametricPatternProperties.defaultProps = {
  userUnitSystem: MeasurementSystem.Metric,
};

export default connect(
  ({
    scene: {
      selection,
      data: { _id: sceneId, fidelityState, children, pointsOfMeasure },
      viewStyle,
      errorDetection,
      accessMode,
      tool,
    },
    userSettings: { units: userUnitSystem },
    scene,
  }) => ({
    scene,
    sceneId,
    selection,
    userUnitSystem,
    viewStyle,
    errorDetection,
    fidelityState,
    accessMode,
    children,
    tool,
    pointsOfMeasure,
  }),
  {
    updatePathNodes,
    updateEntityName,
    updatePieceGrain,
    show: componentActions.dialogs.show,
    updatePointOfMeasureProperty,
    deletePointOfMeasure,
    removeInteriorLines,
  },
)(ParametricPatternProperties);

// Define handleUpdateSlidersComponent como una función normal fuera del componente
function handleUpdateSliders(pomIndex, dispatch, scene) {
  //console.log("handleUpdateSlidersComponent", pomIndex);
  //console.log("aqui peta",scene.data.pointsOfMeasure)
  //console.log("aqui peta",pomIndex)

  if (scene.data.pointsOfMeasure) {
    for (let i = 0; i < scene.data.pointsOfMeasure.length; i++) {
      if (i !== pomIndex) {
        const garmentPieceObject = scene.data.children.find(
          (piece) => piece._id === scene.data.pointsOfMeasure[i].garmentPieceId,
        );
        if (garmentPieceObject) {
          const interiorLineObject = garmentPieceObject.components.garmentPiece.interiorLines.find(
            (line) => line._id === scene.data.pointsOfMeasure[i].interiorLineId,
          );
          if (interiorLineObject) {
            let segmentPath = new Path2(interiorLineObject.path);
            const resultado =
              Number(
                SegmentLabelUtils.GetPathLength(segmentPath, MeasurementSystem.Metric, 1, SCALES.m),
              ) / 2;
            //console.log(i);
            //console.log(Math.round(scene.data.pointsOfMeasure[i].sliderValue));
            //console.log(Math.round(Math.round(resultado)));

            if (Math.round(scene.data.pointsOfMeasure[i].sliderValue) !== Math.round(resultado)) {
              dispatch(updatePointOfMeasureProperty(i, 'sliderValue', resultado));
            }
          }
        }
      }
    }
  }
}

const SliderComponent = ({
  pomIndex,
  initialValue,
  scene,
  onDelete,
  updateSliders,
  onPomIndexChange,
}) => {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState(initialValue);
  const [inputTypeValue, setInputTypeValue] = useState('TYPE');
  const [sliderValue, setSliderValue] = useState(initialValue);
  const [isCheckedConnected, setCheckedConnected] = useState(false);
  const [isCheckedGrading, setCheckedGrading] = useState(false);
  const sceneRef = useRef(scene);

  useEffect(() => {
    sceneRef.current = scene;
    if (
      sliderValue !== sceneRef.current.data.pointsOfMeasure[pomIndex].sliderValue ||
      inputTypeValue !== sceneRef.current.data.pointsOfMeasure[pomIndex].sliderValue
    ) {
      setInputValue(sceneRef.current.data.pointsOfMeasure[pomIndex].sliderValue);
      setSliderValue(sceneRef.current.data.pointsOfMeasure[pomIndex].sliderValue);
    }
    if (isCheckedConnected !== sceneRef.current.data.pointsOfMeasure[pomIndex].connected) {
      setCheckedConnected(sceneRef.current.data.pointsOfMeasure[pomIndex].connected);
    }
  }, [
    scene,
    scene.data.pointsOfMeasure,
    sliderValue,
    inputTypeValue,
    pomIndex,
    isCheckedConnected,
  ]);

  useEffect(() => {
    dispatch(updatePOMInteriorLines(sceneRef.current.data));
  }, [
    dispatch,
    pomIndex,
    inputValue,
    inputTypeValue,
    sliderValue,
    isCheckedConnected,
    isCheckedGrading,
  ]);

  useEffect(() => {
    //console.log(sceneRef.current.data.pointsOfMeasure)
    if (sceneRef.current.data.pointsOfMeasure) {
      const selectionPOM = sceneRef.current.data.children.find(
        (piece) => piece._id === sceneRef.current.data.pointsOfMeasure[pomIndex].garmentPieceId,
      );
      //console.log(selectionPOM)
      if (selectionPOM) {
        let interiorLineExist = selectionPOM.components.garmentPiece.interiorLines.find(
          (line) => line._id === sceneRef.current.data.pointsOfMeasure[pomIndex].interiorLineId,
        );
        if (!interiorLineExist) {
          //console.log("Delete index",pomIndex)
          dispatch(deletePointOfMeasure(pointsOfMeasure[pomIndex]._id));
          //console.log("ESTE ES EL PROBLEMA",pomIndex)
        }
      } else {
        try {
          dispatch(deletePointOfMeasure(pointsOfMeasure[pomIndex]._id));
        } catch {}
        //console.log("ESTE ES EL PROBLEMA2",pomIndex)
      }
    }
  }, [dispatch, pomIndex, sceneRef.current.data.pointsOfMeasure]);

  /*useEffect(() => {
    if(sceneRef.current.data.pointsOfMeasure){
      for (let i = 0; i < sceneRef.current.data.pointsOfMeasure.length; i++) {
        if(i!==pomIndex){
          const garmentPieceObject = sceneRef.current.data.children.find((piece) => piece._id === sceneRef.current.data.pointsOfMeasure[i].garmentPieceId);
          const interiorLineObject = garmentPieceObject.components.garmentPiece.interiorLines.find(line => line._id === sceneRef.current.data.pointsOfMeasure[i].interiorLineId);
  
          let segmentPath=new Path2(interiorLineObject.path);
          //segmentPath.path=store.getState().scene.data.children[4].components.garmentPiece.sewLine.path;
          const resultado = Number(SegmentLabelUtils.GetPathLength(segmentPath, MeasurementSystem.Metric, 1, SCALES.m)) /2;
          console.log(i)
          console.log(Math.round(sceneRef.current.data.pointsOfMeasure[i].sliderValue))
          console.log(Math.round(Math.round(resultado)))

          if(Math.round(sceneRef.current.data.pointsOfMeasure[i].sliderValue) !== Math.round(resultado)){
            dispatch(updatePointOfMeasureProperty(i,'sliderValue',resultado));
          }
        }
        
      }
    }
}, [dispatch, pomIndex, scene]);*/

  const findConnectedPoms = (pomIndex, poms) => {
    const currentPomType = poms[pomIndex].type;

    // Filtrar los POMs que tienen el mismo tipo que el POM en pomIndex
    const connectedPoms = poms.reduce((result, pom, index) => {
      if (index !== pomIndex && pom.type === currentPomType) {
        result.push(index);
      }
      return result;
    }, []);

    return connectedPoms;
  };

  const handleCheckboxChange = (checkboxName) => {
    if (checkboxName === 'connected') {
      const connectedPomIndices = findConnectedPoms(
        pomIndex,
        sceneRef.current.data.pointsOfMeasure,
      );

      if (connectedPomIndices && connectedPomIndices.length > 0) {
        // Iterar sobre los POMs conectados y actualizar sus valores
        connectedPomIndices.forEach((connectedIndex) => {
          dispatch(updatePointOfMeasureProperty(connectedIndex, 'connected', !isCheckedConnected));
        });
      }
      setCheckedConnected(!isCheckedConnected);
      dispatch(updatePointOfMeasureProperty(pomIndex, 'connected', !isCheckedConnected));
    } else if (checkboxName === 'grading') {
      setCheckedGrading(!isCheckedGrading);
      dispatch(updatePointOfMeasureProperty(pomIndex, 'gradding', !isCheckedGrading));
    }
  };
  const handleInputonBlur = (e) => {
    const newValue = parseFloat(e.target.value);
    console.log('handleInputonBLur', newValue);
    if (!isNaN(newValue)) {
      /*if(sceneRef.current.data.pointsOfMeasure[pomIndex].connected){
        const connectedPomIndices = findConnectedPoms(pomIndex,sceneRef.current.data.pointsOfMeasure);
  
        if (connectedPomIndices && connectedPomIndices.length > 0) {
          // Iterar sobre los POMs conectados y actualizar sus valores
          connectedPomIndices.forEach((connectedIndex) => {
            dispatch(updatePointOfMeasureProperty(connectedIndex, 'connected', true));
            dispatch(updatePointOfMeasureProperty(connectedIndex, 'sliderValue', newValue));
          });
        }
      }*/
      setInputValue(newValue);
      setSliderValue(newValue);
      dispatch(updatePointOfMeasureProperty(pomIndex, 'sliderValue', newValue));
      updateSliders(pomIndex);
      onPomIndexChange(pomIndex);
    } else {
      setInputValue(0);
      setSliderValue(0);
      dispatch(updatePointOfMeasureProperty(pomIndex, 'sliderValue', 0));
    }
  };

  const handleInputTypeonBlur = (e) => {
    const val = e.target.value;
    setInputTypeValue(val);
    dispatch(updatePointOfMeasureProperty(pomIndex, 'type', val));
  };

  const handleSliderChange = (value) => {
    /*if(sceneRef.current.data.pointsOfMeasure[pomIndex].connected){
      const connectedPomIndices = findConnectedPoms(pomIndex,sceneRef.current.data.pointsOfMeasure);

      if (connectedPomIndices && connectedPomIndices.length > 0) {
        // Iterar sobre los POMs conectados y actualizar sus valores
        connectedPomIndices.forEach((connectedIndex) => {
          dispatch(updatePointOfMeasureProperty(connectedIndex, 'connected', true));
          dispatch(updatePointOfMeasureProperty(connectedIndex, 'sliderValue', value));
        });
      }
    }
    */
    setInputValue(value);
    setSliderValue(value);
    dispatch(updatePointOfMeasureProperty(pomIndex, 'sliderValue', value));
    updateSliders(pomIndex);
    onPomIndexChange(pomIndex);
  };

  const handleDeleteClick = () => {
    // Llamar a la función onDelete y pasar el índice del POM
    onDelete(pomIndex);
  };

  // ... (otras funciones o renderizado)

  return (
    <div>
      {/* ... (otras partes del componente) */}
      <Button onClick={handleDeleteClick}>Delete</Button>

      <Input
        name="type"
        type="text"
        inputStyle="settings"
        placeholder="Type"
        onBlur={handleInputTypeonBlur}
        value={inputTypeValue}
      />
      <Checkbox
        name="connected"
        label="Connections"
        isSelected={isCheckedConnected}
        onCheckboxChange={() => handleCheckboxChange('connected')}
        disabled={false}
      />
      <Checkbox
        name="grading"
        label="Style Gradding Rule"
        isSelected={isCheckedGrading}
        onCheckboxChange={() => handleCheckboxChange('grading')}
        disabled={false}
      />
      <Input
        name="name"
        type="number"
        placeholder="cm"
        onBlur={handleInputonBlur}
        value={inputValue}
      />

      <RangeSlider
        breakpoints={[0]}
        min={0}
        max={100}
        value={sliderValue}
        step={0.0001}
        disabled={false}
        onChange={handleSliderChange}
      />
      <br></br>

      {/* ... (otras partes del componente) */}
    </div>
  );
};

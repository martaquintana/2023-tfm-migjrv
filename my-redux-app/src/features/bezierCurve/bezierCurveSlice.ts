//Pruebas con Redux, pero no funciona

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Point2,
  BezierPath2,
  BezierCurve2,
} from '../../geometry';

import {
  Point2Draw,
  BezierPath2Draw,
} from '../../graphics';


interface BezierCurveState {
  controlPoints: Point2Draw []
  controlPoints2: Point2Draw[];
}

const initialState: BezierCurveState = {
  controlPoints: [],
  controlPoints2: [],

};

const bezierCurveSlice = createSlice({
  name: 'bezierCurve',
  initialState,
  reducers: {
    setControlPoints: (state, action: PayloadAction<Point2Draw[]>) => {
      state.controlPoints.push(...action.payload);
    },
    
    
    setControlPoints2: (state, action: PayloadAction<Point2Draw[]>) => {
      state.controlPoints2.push(...action.payload);
    },
    clearCanvas: (state) => {
      state.controlPoints = [];
      state.controlPoints2 = [];

    },
  },
});

export const { setControlPoints, setControlPoints2, clearCanvas } = bezierCurveSlice.actions;
export default bezierCurveSlice.reducer;

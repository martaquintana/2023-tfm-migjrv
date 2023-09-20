import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BezierCurveState {
  controlPoints: { x: number; y: number }[];
}

const initialState: BezierCurveState = {
  controlPoints: [],
};

const bezierCurveSlice = createSlice({
  name: 'bezierCurve',
  initialState,
  reducers: {
    setControlPoints: (state, action: PayloadAction<{ x: number; y: number }[]>) => {
      state.controlPoints = action.payload;
    },
  },
});

export const { setControlPoints } = bezierCurveSlice.actions;
export default bezierCurveSlice.reducer;

// drawingSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DrawingState {
  controlPoints: { x: number; y: number }[];
}

const initialState: DrawingState = {
  controlPoints: [],
};

const drawingSlice = createSlice({
  name: 'drawing',
  initialState,
  reducers: {
    addPoint: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.controlPoints.push(action.payload);
    },
    clearCanvas: (state) => {
      state.controlPoints = [];
    },
  },
});

export const { addPoint, clearCanvas } = drawingSlice.actions;
export default drawingSlice.reducer;

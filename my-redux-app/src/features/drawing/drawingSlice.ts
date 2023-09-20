// drawingSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DrawingState {
  points: { x: number; y: number }[];
}

const initialState: DrawingState = {
  points: [],
};

const drawingSlice = createSlice({
  name: 'drawing',
  initialState,
  reducers: {
    addPoint: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.points.push(action.payload);
    },
    clearCanvas: (state) => {
      state.points = [];
    },
  },
});

export const { addPoint, clearCanvas } = drawingSlice.actions;
export default drawingSlice.reducer;

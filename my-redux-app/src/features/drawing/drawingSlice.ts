// drawingSlice.ts
import { createSlice } from '@reduxjs/toolkit';

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
    addPoint: (state, action) => {
      state.points.push(action.payload);
    },
    clearCanvas: (state) => {
      state.points = [];
    },
  },
});

export const { addPoint, clearCanvas } = drawingSlice.actions;
export default drawingSlice.reducer;

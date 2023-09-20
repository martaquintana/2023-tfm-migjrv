
// store.ts
import { configureStore } from '@reduxjs/toolkit';
import drawingReducer from '../features/drawing/drawingSlice';
import counterReducer from '../features/counter/counterSlice'; 
import bezierCurveReducer from '../features/bezierCurve/bezierCurveSlice';


export const store = configureStore({
  reducer: {
    drawing: drawingReducer,
    counter: counterReducer,
    bezierCurve: bezierCurveReducer,

  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

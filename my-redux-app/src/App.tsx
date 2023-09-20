// src/App.tsx

import React from 'react';
import { Provider } from 'react-redux';
import {store} from './redux/store';
import Counter from './components/Counter'; 
import Canvas from './components/Canvas'; 
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <div className="App">
      <header className='App-header'>
        <h1>BEZIER CURVES CANVAS</h1>
      </header>
      {/* <Counter /> */}
        <Canvas />

      </div>
    </Provider>
  );
}

export default App;

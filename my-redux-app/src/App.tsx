// src/App.tsx

import React from 'react';
import { Provider } from 'react-redux';
import {store} from './redux/store';
import Counter from './components/Counter'; 
import Canvas from './components/Canvas'; 

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <h1>Redux Counter & Canvas App</h1>
        <Counter />
        <Canvas />

      </div>
    </Provider>
  );
}

export default App;

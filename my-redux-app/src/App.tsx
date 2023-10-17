// src/App.tsx

import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import Counter from './components/Counter';
import Canvas from './components/Canvas';
import FittingCanvas from './components/FittingCanvas';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'fittingCanvas'>('canvas');

  const changeTab = (tabName: 'canvas' | 'fittingCanvas') => {
    setActiveTab(tabName);
  };

  return (
    <Provider store={store}>
      <div className="App">
        <header className="App-header">
          <h1>BEZIER CURVES CANVAS</h1>
          {/* <Counter /> */}

        </header>
        <div className="tabs">
          <div
            className={`tab ${activeTab === 'canvas' ? 'active-tab' : ''}`}
            onClick={() => changeTab('canvas')}
          >
            Canvas
          </div>
          <div
            className={`tab ${activeTab === 'fittingCanvas' ? 'active-tab' : ''}`}
            onClick={() => changeTab('fittingCanvas')}
          >
            Fitting Canvas
          </div>
        </div>
        <div className="tab-content">
          {activeTab === 'canvas' ? <Canvas /> : null}
          {activeTab === 'fittingCanvas' ? <FittingCanvas /> : null}
        </div>
      </div>
    </Provider>
  );
}

export default App;

// src/components/Counter.tsx

import React from 'react';
import { connect } from 'react-redux';
import { increment, decrement } from '../features/counter/counterSlice'; 
import { RootState } from '../redux/store';

interface CounterProps {
  count: number;
  increment: () => void;
  decrement: () => void;
}


const Counter: React.FC<CounterProps> = ({ count, increment, decrement }) => {
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
};

const mapStateToProps = (state: RootState) => ({
  count: state.counter.value,
});

const mapDispatchToProps = {
  increment,
  decrement,
};

export default connect(mapStateToProps, mapDispatchToProps)(Counter);

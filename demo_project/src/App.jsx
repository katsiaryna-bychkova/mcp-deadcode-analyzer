import React from 'react';
import OldButton from './components/OldButton';  // ❌ DEAD import!
import { debounce } from 'lodash';                // ❌ DEAD import

// ❌ DEAD функция
function UnusedFunction() {
  console.log('never called');
}

// ❌ DEAD компонент  
function OldComponent() {
  return <div>Never rendered</div>;
}

function App() {
  return <div>Hello World!</div>;  // OldButton НЕ используется!
}

export default App;

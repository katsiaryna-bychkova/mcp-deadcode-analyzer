import React from 'react';
import { debounce } from 'lodash';  // DEAD

export function OldButton(props) {
  return <button>Old Button</button>;  // Никогда не рендерится!
}

import React from 'react';
import ReactDOM from 'react-dom/client';

// M8M framework styles (global reset + CSS variables)
import './m8m-base.css';

import { AtasApp } from './projects/atas/AtasApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AtasApp />
  </React.StrictMode>,
);

/**
 * AppContainer - Wrapper component that provides Router context
 * This ensures all hooks can access Router features like useNavigate()
 */

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

function AppContainer() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppContainer;

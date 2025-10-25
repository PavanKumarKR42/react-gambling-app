import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('🎲 Crypto Betting DApp Initialized');
console.log('📍 Contract: Check constants.js');
console.log('💰 Tokens: BTC, ETH');
console.log('⏱️ Betting: 2 min | Total: 3 min | Refresh: 5s');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.jsx';

try {
  const html = renderToString(React.createElement(App));
  console.log('SUCCESS! SSR HTML Length:', html.length);
  console.log('HTML preview:', html.slice(0, 300));
} catch (err) {
  console.error('ERROR rendering App:', err);
}

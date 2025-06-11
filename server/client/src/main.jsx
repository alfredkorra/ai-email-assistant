// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// // import './index.css'
// import App from './App.jsx'
// import 'antd/dist/reset.css';


// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )


import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import 'antd/dist/reset.css';
import { ConfigProvider } from 'antd';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      warnings={{ strict: false }} // ✅ Enables compatibility with React 19
      message={{ getContainer: () => document.body }} // optional: ensure message renders outside modals
    >
      <App />
    </ConfigProvider>
  </StrictMode>
);

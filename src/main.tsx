import React from 'react'
import ReactDOM from 'react-dom/client'
import SimpleApp from './SimpleApp.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SimpleApp />
    </AuthProvider>
  </React.StrictMode>,
)

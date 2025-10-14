import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.jsx'
import { Dashboard } from './components/Dashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
)

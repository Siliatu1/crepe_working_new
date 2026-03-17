import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './styles/main.scss'
import App from './App.jsx'

const LoadingApp = () => <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Cargando aplicación...</div>

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)


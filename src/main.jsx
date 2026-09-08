import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import './editorial.css'
import '@fontsource-variable/playfair-display/wght.css'
import '@fontsource-variable/playfair-display/wght-italic.css'
import '@fontsource-variable/albert-sans/wght.css'
import './reading-layout.css'
import './reading-motion.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import './ui-type.css'
import '@fontsource-variable/noto-serif-sc/wght.css'
import '@fontsource/cormorant-garamond/300-italic.css'

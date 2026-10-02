// Must stay the first import: it reads the invite/recovery link type before the Supabase client
// strips the tokens from the URL.
import './lib/linkType'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

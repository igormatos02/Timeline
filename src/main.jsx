import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { getLegalPage, PrivacyPolicyPage, DeleteAccountPage } from './components/legal/LegalPages.jsx'

// Public legal pages (privacy policy, account deletion) are served by the same app, outside the workspace
const legalPage = getLegalPage(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      {legalPage === 'privacy' ? <PrivacyPolicyPage />
        : legalPage === 'deleteAccount' ? <DeleteAccountPage />
        : (
          <ToastProvider>
            <App />
          </ToastProvider>
        )}
    </LanguageProvider>
  </StrictMode>,
)

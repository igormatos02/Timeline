import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { getLegalPage, PrivacyPolicyPage, DeleteAccountPage, TermsPage, DataProcessingAgreementPage } from './components/legal/LegalPages.jsx'
import ReceiptVerifyPage, { receiptCodeFromPath } from './components/receipts/ReceiptVerifyPage.jsx'

// Public legal pages (privacy policy, account deletion, terms, data processing agreement) are served by the same app, outside the workspace
const legalPage = getLegalPage(window.location.pathname)
// Public receipt verification (/recibo/<code>), opened from a receipt's QR code or e-mail
const receiptCode = receiptCodeFromPath(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      {receiptCode !== null ? <ReceiptVerifyPage initialCode={receiptCode} />
        : legalPage === 'privacy' ? <PrivacyPolicyPage />
        : legalPage === 'deleteAccount' ? <DeleteAccountPage />
        : legalPage === 'terms' ? <TermsPage />
        : legalPage === 'dpa' ? <DataProcessingAgreementPage />
        : (
          <ToastProvider>
            <App />
          </ToastProvider>
        )}
    </LanguageProvider>
  </StrictMode>,
)

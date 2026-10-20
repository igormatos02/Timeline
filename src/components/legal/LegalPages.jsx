import React, { useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import * as api from '../../services/api.js';
import { SUPPORT_EMAIL } from '../../../shared/config/appConfig.js';
import { BRAND, LEGAL_ENTITY, LEGAL_LAST_UPDATED, SUBPROCESSORS } from '../../../shared/config/businessConfig.js';
import styles from './Legal.module.css';

// Public paths of the legal pages (Portuguese and English aliases)
export const LegalPath = Object.freeze({
  PRIVACY: ['/privacidade', '/privacy'],
  DELETE_ACCOUNT: ['/eliminar-conta', '/delete-account'],
  TERMS: ['/termos', '/terms'],
  DPA: ['/dpa', '/acordo-tratamento-dados']
});

// Legal documents: their translation key under `legal.` and how many numbered sections (sNTitle / sNBody) they have
const LEGAL_DOCUMENTS = Object.freeze({
  privacy: { key: 'privacy', sections: 10, subprocessorsAfter: 4 },
  terms: { key: 'terms', sections: 11 },
  dpa: { key: 'dpa', sections: 10, subprocessorsAfter: 6 }
});

// Values the legal texts refer to (business configuration: brand and legal entity)
const LEGAL_PARAMS = {
  email: SUPPORT_EMAIL,
  entityName: LEGAL_ENTITY.name,
  taxId: LEGAL_ENTITY.taxId,
  entityEmail: LEGAL_ENTITY.email,
  entityAddress: LEGAL_ENTITY.address || LEGAL_ENTITY.country,
  product: BRAND.product,
  platform: BRAND.platform,
  domain: BRAND.domain
};
const LANGUAGES = ['pt', 'en'];

/** Resolves the legal page for the current URL path (or null for the regular app). */
export function getLegalPage(pathname) {
  const path = String(pathname || '').replace(/\/$/, '').toLowerCase();
  if (LegalPath.PRIVACY.includes(path)) return 'privacy';
  if (LegalPath.DELETE_ACCOUNT.includes(path)) return 'deleteAccount';
  if (LegalPath.TERMS.includes(path)) return 'terms';
  if (LegalPath.DPA.includes(path)) return 'dpa';
  return null;
}

const Paragraphs = ({ text }) => String(text).split('\n\n').map((part) => (
  <p key={part.slice(0, 24)} className={styles.paragraph}>{part}</p>
));

function LegalLayout({ children }) {
  const { t, language, setLanguage } = useTranslation();
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <a className={styles.link} href="/">{t('legal.backHome')}</a>
          <div className={styles.langSwitch} role="group">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                className={`${styles.langButton} ${language === lang ? styles.langActive : ''}`}
                onClick={() => setLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {children}
        <div className={styles.footerLinks}>
          <a className={styles.link} href={LegalPath.PRIVACY[0]}>{t('legal.privacyLink')}</a>
          <a className={styles.link} href={LegalPath.DELETE_ACCOUNT[0]}>{t('legal.deleteAccountLink')}</a>
          <a className={styles.link} href={LegalPath.TERMS[0]}>{t('legal.termsLink')}</a>
          <a className={styles.link} href={LegalPath.DPA[0]}>{t('legal.dpaLink')}</a>
        </div>
      </div>
    </div>
  );
}

// Sub-processors of the service, from the business configuration
function SubprocessorList() {
  const { t } = useTranslation();
  return (
    <section>
      <h2 className={styles.sectionTitle}>{t('legal.subprocessorsTitle')}</h2>
      <ul className={styles.paragraph}>
        {SUBPROCESSORS.map((processor) => (
          <li key={processor.name}>{processor.name}: {t(`legal.subprocessors.${processor.purposeKey}`)}</li>
        ))}
      </ul>
    </section>
  );
}

// A legal document of numbered sections (privacy policy, terms, data processing agreement)
function LegalDocument({ document }) {
  const { t, dateLocale } = useTranslation();
  const updated = new Date(`${LEGAL_LAST_UPDATED}T12:00:00`).toLocaleDateString(dateLocale?.code || undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const numbers = Array.from({ length: document.sections }, (_, index) => index + 1);
  return (
    <LegalLayout>
      <article className={styles.card}>
        <h1 className={styles.title}>{t(`legal.${document.key}.title`)}</h1>
        <p className={styles.updated}>{t('legal.lastUpdated', { date: updated })}</p>
        <Paragraphs text={t(`legal.${document.key}.intro`, LEGAL_PARAMS)} />
        {numbers.map((n) => (
          <React.Fragment key={n}>
            <section>
              <h2 className={styles.sectionTitle}>{t(`legal.${document.key}.s${n}Title`)}</h2>
              <Paragraphs text={t(`legal.${document.key}.s${n}Body`, LEGAL_PARAMS)} />
            </section>
            {document.subprocessorsAfter === n && <SubprocessorList />}
          </React.Fragment>
        ))}
      </article>
    </LegalLayout>
  );
}

export const PrivacyPolicyPage = () => <LegalDocument document={LEGAL_DOCUMENTS.privacy} />;
export const TermsPage = () => <LegalDocument document={LEGAL_DOCUMENTS.terms} />;
export const DataProcessingAgreementPage = () => <LegalDocument document={LEGAL_DOCUMENTS.dpa} />;

export function DeleteAccountPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState(() => api.getCurrentUser());
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAccount();
      await api.logoutUser();
      setUser(null);
      setMessage({ text: t('legal.deleteAccount.deleted'), isError: false });
    } catch (err) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  return (
    <LegalLayout>
      <article className={styles.card}>
        <h1 className={styles.title}>{t('legal.deleteAccount.title')}</h1>
        <Paragraphs text={t('legal.deleteAccount.intro')} />

        <h2 className={styles.sectionTitle}>{t('legal.deleteAccount.keptTitle')}</h2>
        <Paragraphs text={t('legal.deleteAccount.keptBody')} />
        <div className={styles.note}>{t('legal.deleteAccount.ownerNote')}</div>

        <h2 className={styles.sectionTitle}>{t('legal.deleteAccount.howTitle')}</h2>
        <Paragraphs text={t('legal.deleteAccount.howApp')} />
        <Paragraphs text={t('legal.deleteAccount.howWeb')} />
        <Paragraphs text={t('legal.deleteAccount.howEmail', { email: SUPPORT_EMAIL })} />

        <div className={styles.note}>
          {user ? t('legal.deleteAccount.signedInAs', { email: user.email }) : t('legal.deleteAccount.notSignedIn')}
        </div>
        <div className={styles.actions}>
          {!user ? (
            <a className={styles.secondaryButton} href="/">{t('legal.deleteAccount.signIn')}</a>
          ) : isConfirming ? (
            <>
              <button type="button" className={styles.dangerButton} onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? t('legal.deleteAccount.deleting') : t('legal.deleteAccount.confirmButton')}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setIsConfirming(false)} disabled={isDeleting}>
                {t('legal.deleteAccount.cancel')}
              </button>
            </>
          ) : (
            <button type="button" className={styles.dangerButton} onClick={() => setIsConfirming(true)}>
              {t('legal.deleteAccount.button')}
            </button>
          )}
        </div>
        {isConfirming && (
          <p className={styles.message}>
            <strong>{t('legal.deleteAccount.confirmTitle')}</strong> {t('legal.deleteAccount.confirmBody')}
          </p>
        )}
        {message.text && (
          <p className={styles.message} style={{ color: message.isError ? 'var(--danger)' : 'var(--success)' }}>{message.text}</p>
        )}
      </article>
    </LegalLayout>
  );
}

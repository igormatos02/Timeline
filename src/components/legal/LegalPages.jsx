import React, { useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import * as api from '../../services/api.js';
import { SUPPORT_EMAIL } from '../../../shared/config/appConfig.js';
import styles from './Legal.module.css';

// Public paths of the legal pages (Portuguese and English aliases)
export const LegalPath = Object.freeze({
  PRIVACY: ['/privacidade', '/privacy'],
  DELETE_ACCOUNT: ['/eliminar-conta', '/delete-account']
});

const LAST_UPDATED = '2026-09-28';
const PRIVACY_SECTIONS = Array.from({ length: 10 }, (_, index) => index + 1);
const LANGUAGES = ['pt', 'en'];

/** Resolves the legal page for the current URL path (or null for the regular app). */
export function getLegalPage(pathname) {
  const path = String(pathname || '').replace(/\/$/, '').toLowerCase();
  if (LegalPath.PRIVACY.includes(path)) return 'privacy';
  if (LegalPath.DELETE_ACCOUNT.includes(path)) return 'deleteAccount';
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
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  const { t, dateLocale } = useTranslation();
  const updated = new Date(`${LAST_UPDATED}T12:00:00`).toLocaleDateString(dateLocale?.code || undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <LegalLayout>
      <article className={styles.card}>
        <h1 className={styles.title}>{t('legal.privacy.title')}</h1>
        <p className={styles.updated}>{t('legal.lastUpdated', { date: updated })}</p>
        <Paragraphs text={t('legal.privacy.intro')} />
        {PRIVACY_SECTIONS.map((n) => (
          <section key={n}>
            <h2 className={styles.sectionTitle}>{t(`legal.privacy.s${n}Title`)}</h2>
            <Paragraphs text={t(`legal.privacy.s${n}Body`, { email: SUPPORT_EMAIL })} />
          </section>
        ))}
      </article>
    </LegalLayout>
  );
}

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

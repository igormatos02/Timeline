import React from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Calendar,
  FileText,
  Home,
  Layers,
  PieChart,
  Receipt,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
  Zap
} from 'lucide-react';
import AuthCard from './AuthCard.jsx';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';
import { BRAND } from '../../../shared/config/businessConfig.js';
import { ProductId } from '../../../shared/config/products.js';
import { LegalPath } from '../legal/LegalPages.jsx';
import './LandingPage.css';

// What each product's page shows: its texts (translation namespace), highlights and features
const PRODUCT_LANDINGS = Object.freeze({
  [ProductId.CONDOFLOW]: {
    textKey: 'landing.condoflow',
    icon: Home,
    pills: [['fees', Receipt, TimelineColor.CONDOFLOW], ['owners', Users, TimelineColor.PRIMARY], ['apps', Smartphone, TimelineColor.PURPLE]],
    features: [
      ['fees', Receipt, TimelineColor.CONDOFLOW],
      ['accounts', Wallet, TimelineColor.FINANCIAL],
      ['owners', Users, TimelineColor.PRIMARY],
      ['notices', Bell, TimelineColor.WARNING],
      ['apps', Smartphone, TimelineColor.PURPLE],
      ['reports', FileText, TimelineColor.BLUE]
    ]
  },
  [ProductId.MYFINANCE]: {
    textKey: 'landing',
    icon: Wallet,
    pills: [['amortization', TrendingUp, TimelineColor.FINANCIAL], ['entities', Users, TimelineColor.PRIMARY], ['projections', PieChart, TimelineColor.PURPLE]],
    features: [
      ['timeline', Layers, TimelineColor.PRIMARY],
      ['loans', BarChart3, TimelineColor.PURPLE],
      ['multiEntity', Users, TimelineColor.WARNING],
      ['investments', TrendingUp, TimelineColor.FINANCIAL],
      ['projections', Calendar, TimelineColor.BLUE],
      ['reminders', ShieldCheck, TimelineColor.PINK]
    ]
  }
});

/** Public page of a product (/condoflow, /myfinance): what it does and the login. */
export default function LandingPage({ product, onAuthSuccess, initialEmail = '', pendingInvite = null }) {
  const { t } = useTranslation();
  const landing = PRODUCT_LANDINGS[product?.id] || PRODUCT_LANDINGS[ProductId.MYFINANCE];
  const { textKey } = landing;
  const BrandIcon = landing.icon;
  return (
    <div className="landing-container">
      <div className="landing-bg-glow" />
      <div className="landing-grid-pattern" />

      <header className="landing-header">
        <a href={`/${product?.path || ''}`} className="landing-brand">
          <div className="landing-brand-icon" style={{ background: product?.color }}>
            <BrandIcon size={22} />
          </div>
          <span>{product?.name}</span>
        </a>

        <div className="landing-nav-actions">
          <a href="/" className="landing-badge" style={{ margin: 0, textDecoration: 'none' }}>
            <ArrowLeft size={14} />
            <span>{t('landing.productOf', { platform: BRAND.platform })}</span>
          </a>
        </div>
      </header>

      <main className="landing-hero">
        <div className="landing-hero-text">
          <div className="landing-badge">
            <Zap size={14} style={{ color: TimelineColor.WARNING }} />
            <span>{t(`${textKey}.badge`)}</span>
          </div>

          <h1 className="landing-hero-title" dangerouslySetInnerHTML={{ __html: t(`${textKey}.title`) }} />

          <p className="landing-hero-subtitle">{t(`${textKey}.subtitle`)}</p>

          <div className="landing-pills-row">
            {landing.pills.map(([key, Icon, color]) => (
              <div key={key} className="landing-pill">
                <Icon size={16} style={{ color }} />
                <span>{t(`${textKey}.pills.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero-auth">
          <AuthCard onAuthSuccess={onAuthSuccess} initialEmail={initialEmail} pendingInvite={pendingInvite} />
        </div>
      </main>

      <section className="landing-features-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">{t(`${textKey}.featuresTitle`)}</h2>
          <p className="landing-section-subtitle">{t(`${textKey}.featuresSubtitle`)}</p>
        </div>

        <div className="landing-cards-grid">
          {landing.features.map(([key, Icon, color]) => (
            <div key={key} className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: `${color}26`, color }}>
                <Icon size={24} />
              </div>
              <h3 className="landing-feature-title">{t(`${textKey}.features.${key}.title`)}</h3>
              <p className="landing-feature-desc">{t(`${textKey}.features.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

/** Footer of the public pages: the platform and the legal documents. */
export function LandingFooter() {
  const { t } = useTranslation();
  return (
    <footer className="landing-footer">
      <p>© {new Date().getFullYear()} {BRAND.platform}. {t('landing.footer')}</p>
      <p style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={LegalPath.TERMS[0]} style={{ color: 'inherit' }}>{t('legal.termsLink')}</a>
        <a href={LegalPath.PRIVACY[0]} style={{ color: 'inherit' }}>{t('legal.privacyLink')}</a>
        <a href={LegalPath.DPA[0]} style={{ color: 'inherit' }}>{t('legal.dpaLink')}</a>
        <a href={LegalPath.DELETE_ACCOUNT[0]} style={{ color: 'inherit' }}>{t('legal.deleteAccountLink')}</a>
      </p>
    </footer>
  );
}

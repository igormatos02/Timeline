import React from 'react';
import { ArrowRight, Clock, Home, LogOut, Moon, Sun, Wallet } from 'lucide-react';
import AuthCard from './AuthCard.jsx';
import { LandingFooter } from './LandingPage.jsx';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';
import { BRAND } from '../../../shared/config/businessConfig.js';
import { PRODUCT_LIST, ProductId } from '../../../shared/config/products.js';
import './LandingPage.css';

const PRODUCT_ICONS = Object.freeze({ [ProductId.CONDOFLOW]: Home, [ProductId.MYFINANCE]: Wallet });

/**
 * The platform's root (/): presents the Timeboard products and leads to each one (/condoflow, /myfinance).
 * Logged out it also offers the login; logged in it greets the user and opens the products.
 */
export default function PlatformHome({ currentUser = null, onAuthSuccess, initialEmail = '', pendingInvite = null, onOpenProduct, onLogout, theme, onToggleTheme }) {
  const { t } = useTranslation();
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : '';

  const productCards = (
    <div className="landing-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
      {PRODUCT_LIST.map((product) => {
        const Icon = PRODUCT_ICONS[product.id];
        return (
          <button
            key={product.id}
            type="button"
            className="landing-feature-card"
            onClick={() => onOpenProduct(product)}
            style={{ textAlign: 'left', cursor: 'pointer', border: `1px solid ${product.color}4d`, font: 'inherit', color: 'inherit' }}
          >
            <div className="landing-feature-icon" style={{ background: `${product.color}26`, color: product.color }}>
              <Icon size={24} />
            </div>
            <h3 className="landing-feature-title">{product.name}</h3>
            <p className="landing-feature-desc" style={{ fontWeight: 600 }}>{t(`platform.products.${product.id}.tagline`)}</p>
            <p className="landing-feature-desc">{t(`platform.products.${product.id}.desc`)}</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: product.color, fontWeight: 700 }}>
              {t(currentUser ? 'platform.open' : 'platform.learnMore', { product: product.name })}
              <ArrowRight size={16} />
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="landing-container">
      <div className="landing-bg-glow" />
      <div className="landing-grid-pattern" />

      <header className="landing-header">
        <a href="/" className="landing-brand">
          <div className="landing-brand-icon">
            <Clock size={22} />
          </div>
          <span>{BRAND.platform}</span>
        </a>
        {currentUser && (
          <div className="landing-nav-actions" style={{ gap: '10px' }}>
            {onToggleTheme && (
              <button type="button" className="landing-badge" style={{ margin: 0, cursor: 'pointer' }} onClick={onToggleTheme} title={theme === 'dark' ? t('header.toggleThemeLight') : t('header.toggleThemeDark')}>
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            )}
            <span className="landing-badge" style={{ margin: 0 }}>{currentUser.name || currentUser.email}</span>
            <button type="button" className="landing-badge" style={{ margin: 0, cursor: 'pointer', color: TimelineColor.DANGER }} onClick={onLogout}>
              <LogOut size={14} />
              <span>{t('header.logout')}</span>
            </button>
          </div>
        )}
      </header>

      <main className="landing-hero" style={currentUser ? { gridTemplateColumns: '1fr' } : undefined}>
        <div className="landing-hero-text">
          <h1 className="landing-hero-title" dangerouslySetInnerHTML={{ __html: currentUser ? t('platform.greeting', { name: firstName }) : t('platform.title') }} />
          <p className="landing-hero-subtitle">{t(currentUser ? 'platform.chooseProduct' : 'platform.subtitle')}</p>
          {currentUser && productCards}
        </div>
        {!currentUser && (
          <div className="landing-hero-auth">
            <AuthCard onAuthSuccess={onAuthSuccess} initialEmail={initialEmail} pendingInvite={pendingInvite} />
          </div>
        )}
      </main>

      {!currentUser && (
        <section className="landing-features-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">{t('platform.productsTitle')}</h2>
            <p className="landing-section-subtitle">{t('platform.productsSubtitle')}</p>
          </div>
          {productCards}
        </section>
      )}

      <LandingFooter />
    </div>
  );
}

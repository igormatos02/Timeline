import React from 'react';
import {
  Clock,
  Sparkles,
  TrendingUp,
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  Users,
  Zap,
  ArrowRight,
  PieChart,
  BarChart3,
  CreditCard,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import AuthCard from './AuthCard.jsx';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import './LandingPage.css';

export default function LandingPage({ onAuthSuccess, initialEmail = '', pendingInvite = null }) {
  const { t } = useTranslation();
  return (
    <div className="landing-container">
      {/* Dynamic Glow and Grid Background */}
      <div className="landing-bg-glow" />
      <div className="landing-grid-pattern" />

      {/* Header */}
      <header className="landing-header">
        <a href="/" className="landing-brand">
          <div className="landing-brand-icon">
            <Clock size={22} />
          </div>
          <span>Timeboard</span>
        </a>

        <div className="landing-nav-actions">
          <div className="landing-badge" style={{ margin: 0 }}>
            <Sparkles size={14} style={{ color: '#818cf8' }} />
            <span>v2.0 Financial Engine</span>
          </div>
        </div>
      </header>

      {/* Hero & Auth Section */}
      <main className="landing-hero">
        {/* Left Column: Hero Copy */}
        <div className="landing-hero-text">
          <div className="landing-badge">
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <span>{t('landing.badge')}</span>
          </div>

          <h1 className="landing-hero-title" dangerouslySetInnerHTML={{ __html: t('landing.title') }} />

          <p className="landing-hero-subtitle">
            {t('landing.subtitle')}
          </p>

          <div className="landing-pills-row">
            <div className="landing-pill">
              <TrendingUp size={16} style={{ color: '#10b981' }} />
              <span>{t('landing.pills.amortization')}</span>
            </div>
            <div className="landing-pill">
              <Users size={16} style={{ color: '#6366f1' }} />
              <span>{t('landing.pills.entities')}</span>
            </div>
            <div className="landing-pill">
              <PieChart size={16} style={{ color: '#a855f7' }} />
              <span>{t('landing.pills.projections')}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Card */}
        <div className="landing-hero-auth">
          <AuthCard
            onAuthSuccess={onAuthSuccess}
            initialEmail={initialEmail}
            pendingInvite={pendingInvite}
            t={t}
          />
        </div>
      </main>

      {/* Features Showcase Section */}
      <section className="landing-features-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">{t('landing.featuresTitle')}</h2>
          <p className="landing-section-subtitle">
            {t('landing.featuresSubtitle')}
          </p>
        </div>

        <div className="landing-cards-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Layers size={24} />
            </div>
            <h3 className="landing-feature-title">{t('landing.features.timeline.title')}</h3>
            <p className="landing-feature-desc">
              {t('landing.features.timeline.desc')}
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <BarChart3 size={24} />
            </div>
            <h3 className="landing-feature-title">{t('landing.features.loans.title')}</h3>
            <p className="landing-feature-desc">
              {t('landing.features.loans.desc')}
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Users size={24} />
            </div>
            <h3 className="landing-feature-title">{t('landing.features.multiEntity.title')}</h3>
            <p className="landing-feature-desc">
              {t('landing.features.multiEntity.desc')}
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <TrendingUp size={24} />
            </div>
            <h3 className="landing-feature-title">{t('landing.features.loans.title')}</h3>
            <p className="landing-feature-desc">
              {t('landing.features.loans.desc')}
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Calendar size={24} />
            </div>
            <h3 className="landing-feature-title">{t('landing.features.projections.title')}</h3>
            <p className="landing-feature-desc">
              {t('landing.features.projections.desc')}
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 className="landing-feature-title">{t('landing.features.reminders.title')}</h3>
            <p className="landing-feature-desc">
              {t('landing.features.reminders.desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Timeboard. {t('landing.footer')}</p>
      </footer>
    </div>
  );
}

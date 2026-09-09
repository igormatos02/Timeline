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
import './LandingPage.css';

export default function LandingPage({ onAuthSuccess, t }) {
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
            <span>Gestão Financeira & Linhas Temporais Interativas</span>
          </div>

          <h1 className="landing-hero-title">
            Onde o tempo encontra a <span className="landing-hero-gradient-text">clareza financeira</span>.
          </h1>

          <p className="landing-hero-subtitle">
            Planeie receitas, despesas, empréstimos e investimentos numa linha temporal intuitiva. 
            Controle obrigações por membro, empresa ou pessoa num único ecossistema inteligente.
          </p>

          <div className="landing-pills-row">
            <div className="landing-pill">
              <TrendingUp size={16} style={{ color: '#10b981' }} />
              <span>Cálculo de Amortizações em Tempo Real</span>
            </div>
            <div className="landing-pill">
              <Users size={16} style={{ color: '#6366f1' }} />
              <span>Multi-Entidades & Obrigações</span>
            </div>
            <div className="landing-pill">
              <PieChart size={16} style={{ color: '#a855f7' }} />
              <span>Projeções & Metas Anuais</span>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Card */}
        <div className="landing-hero-auth">
          <AuthCard onAuthSuccess={onAuthSuccess} t={t} />
        </div>
      </main>

      {/* Features Showcase Section */}
      <section className="landing-features-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Construído para controlo total e visão estratégica</h2>
          <p className="landing-section-subtitle">
            Tudo o que precisa para gerir múltiplos orçamentos, investimentos e cronogramas financeiros.
          </p>
        </div>

        <div className="landing-cards-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Layers size={24} />
            </div>
            <h3 className="landing-feature-title">Multi-Timeboards Dinâmicos</h3>
            <p className="landing-feature-desc">
              Organize diferentes projetos, condomínios, empresas ou finanças pessoais em dashboards dedicados e independentes.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <TrendingUp size={24} />
            </div>
            <h3 className="landing-feature-title">Motor de Crédito & Amortizações</h3>
            <p className="landing-feature-desc">
              Simulação de redução de prazo ou de prestação, liquidação pontual ou em cadeia com recálculo automático de juros.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Users size={24} />
            </div>
            <h3 className="landing-feature-title">Atribuição de Obrigações</h3>
            <p className="landing-feature-desc">
              Associe eventos financeiros a pessoas, membros de equipa ou organizações com rastreamento visual nos cartões.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <BarChart3 size={24} />
            </div>
            <h3 className="landing-feature-title">Balanço & Metas Anuais</h3>
            <p className="landing-feature-desc">
              Acompanhe metas de poupança e rendimento anual, comparando saldos reais com metas orçamentadas mês a mês.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Calendar size={24} />
            </div>
            <h3 className="landing-feature-title">Navegação Temporal Contínua</h3>
            <p className="landing-feature-desc">
              Navegue suavemente entre semanas, meses e anos com horizonte de previsão configurável e salto rápido para o dia atual.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 className="landing-feature-title">Segurança & Sincronização em Nuvem</h3>
            <p className="landing-feature-desc">
              Base de dados segura no Supabase com suporte multi-tenant, persistência robusta e cache offline instantâneo.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Timeboard. Gestão financeira inteligente & linhas temporais.</p>
      </footer>
    </div>
  );
}

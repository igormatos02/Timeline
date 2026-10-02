import React from 'react';
import { EventType, TimelineColor } from '../../../shared/enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { Landmark, Wallet } from 'lucide-react';

const PARTICLES = [
  { id: 1, delay: -3.0, duration: 3.6, size: 6.0, opacity: 1.0, top: '48%' },
  { id: 2, delay: -2.7, duration: 4.4, size: 3.5, opacity: 0.5, top: '22%' },
  { id: 3, delay: -2.4, duration: 3.2, size: 5.0, opacity: 0.9, top: '68%' },
  { id: 4, delay: -2.1, duration: 4.8, size: 2.5, opacity: 0.4, top: '15%' },
  { id: 5, delay: -1.8, duration: 3.8, size: 7.0, opacity: 1.0, top: '45%' },
  { id: 6, delay: -1.5, duration: 3.4, size: 4.0, opacity: 0.75, top: '78%' },
  { id: 7, delay: -1.2, duration: 4.5, size: 3.0, opacity: 0.45, top: '30%' },
  { id: 8, delay: -0.9, duration: 3.7, size: 5.5, opacity: 0.95, top: '55%' },
  { id: 9, delay: -0.6, duration: 3.1, size: 6.2, opacity: 0.9, top: '42%' },
  { id: 10, delay: -0.3, duration: 4.9, size: 2.8, opacity: 0.35, top: '85%' },
  { id: 11, delay: 0.0, duration: 3.9, size: 7.5, opacity: 1.0, top: '50%' },
  { id: 12, delay: 0.3, duration: 3.3, size: 4.5, opacity: 0.8, top: '25%' },
  { id: 13, delay: 0.6, duration: 4.6, size: 3.2, opacity: 0.5, top: '72%' },
  { id: 14, delay: 0.9, duration: 3.7, size: 5.2, opacity: 0.85, top: '38%' },
  { id: 15, delay: 1.2, duration: 3.2, size: 6.8, opacity: 1.0, top: '58%' },
  { id: 16, delay: 1.5, duration: 4.7, size: 2.5, opacity: 0.4, top: '18%' },
  { id: 17, delay: 1.8, duration: 3.5, size: 4.8, opacity: 0.75, top: '65%' },
  { id: 18, delay: 2.1, duration: 3.1, size: 6.0, opacity: 0.95, top: '46%' },
  { id: 19, delay: 2.4, duration: 4.8, size: 3.5, opacity: 0.55, top: '80%' },
  { id: 20, delay: 2.7, duration: 3.9, size: 5.8, opacity: 0.9, top: '32%' },
  { id: 21, delay: 3.0, duration: 3.4, size: 3.8, opacity: 0.65, top: '60%' },
  { id: 22, delay: 3.3, duration: 4.3, size: 7.2, opacity: 1.0, top: '50%' },
  { id: 23, delay: 3.6, duration: 3.0, size: 4.2, opacity: 0.7, top: '28%' },
  { id: 24, delay: 3.9, duration: 4.8, size: 2.6, opacity: 0.35, top: '75%' },
  { id: 25, delay: 4.2, duration: 3.6, size: 6.5, opacity: 0.95, top: '44%' },
  { id: 26, delay: 4.5, duration: 3.4, size: 5.0, opacity: 0.85, top: '56%' },
  { id: 27, delay: 4.8, duration: 4.4, size: 3.4, opacity: 0.45, top: '20%' },
  { id: 28, delay: 5.1, duration: 3.2, size: 6.4, opacity: 1.0, top: '52%' }
];

export default function FlowStreamAnimation({ type = EventType.INCOME }) {
  const { t } = useTranslation();
  const isInflow = type === EventType.INCOME || type === EventType.INVESTMENT;
  const isAccount = type === EventType.INVESTMENT;

  return (
    <div
      className="flow-stream-flat-card"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '4px 6px 0px',
        background: 'transparent',
        border: 'none',
        position: 'relative',
        userSelect: 'none',
        marginBottom: '0px'
      }}
    >
      <style>{`
        @keyframes linearShowerFlow {
          0% {
            left: 0%;
            transform: translateY(-50%) scale(0.25);
            opacity: 0;
          }
          15% {
            opacity: var(--particle-opacity, 0.85);
            transform: translateY(-50%) scale(0.9);
          }
          85% {
            opacity: var(--particle-opacity, 0.85);
            transform: translateY(-50%) scale(0.9);
          }
          100% {
            left: 100%;
            transform: translateY(-50%) scale(0.25);
            opacity: 0;
          }
        }
        @keyframes focusBlinkPulseLight {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.4));
            opacity: 1;
          }
          50% {
            transform: scale(1.06);
            filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.75));
            opacity: 0.9;
          }
        }
        @keyframes walletBlinkPulseLight {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            transform: scale(1.03);
            box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.25);
          }
        }
      `}</style>

      {/* 🌟 1. ESTAÇÃO ESQUERDA: ORIGEM (Bolinha dentro de um círculo) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          width: '64px',
          zIndex: 2,
          flexShrink: 0
        }}
      >
        <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: isInflow ? `2px solid ${TimelineColor.WHITE}` : '1.5px solid rgba(255, 255, 255, 0.35)',
              background: isInflow ? 'rgba(255, 255, 255, 0.28)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: isInflow ? 'focusBlinkPulseLight 2s ease-in-out infinite' : 'none'
            }}
          >
            {/* Bolinha interna */}
            <div
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: isInflow ? TimelineColor.WHITE : 'rgba(255, 255, 255, 0.45)',
                transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            color: isInflow ? TimelineColor.WHITE : 'rgba(255, 255, 255, 0.65)',
            fontWeight: isInflow ? '700' : '500',
            transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            textAlign: 'center'
          }}
        >
          {t('flow.origin')}
        </span>
      </div>

      {/* 🌟 2. TRILHO FLUXO RETO ESQUERDA ➔ CARTEIRA */}
      <div
        style={{
          flex: 1,
          height: '44px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible'
        }}
      >
        {/* Linha de trilho reta perfeitamente centralizada */}
        <div
          style={{
            position: 'absolute',
            left: '2px',
            right: '2px',
            top: '50%',
            height: '1.5px',
            transform: 'translateY(-50%)',
            background: isInflow
              ? 'rgba(255, 255, 255, 0.28)'
              : 'rgba(255, 255, 255, 0.16)',
            borderRadius: '2px',
            transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        {/* Chuva rica de bolinhas no fluxo horizontal quando Entrada */}
        {isInflow && PARTICLES.map((p) => (
          <span
            key={p.id}
            style={{
              position: 'absolute',
              top: p.top,
              left: '0%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: TimelineColor.WHITE,
              opacity: 0,
              boxShadow: p.size > 5
                ? '0 0 6px rgba(255, 255, 255, 0.9), 0 0 2px rgba(255, 255, 255, 1)'
                : '0 0 3px rgba(255, 255, 255, 0.7)',
              animation: `linearShowerFlow ${p.duration}s cubic-bezier(0.35, 0, 0.25, 1) infinite`,
              animationDelay: `${p.delay}s`,
              animationFillMode: 'both',
              '--particle-opacity': p.opacity,
              pointerEvents: 'none'
            }}
          />
        ))}
      </div>

      {/* 🌟 3. ESTAÇÃO CENTRAL: CARTEIRA (Ícone de carteira em círculo maior) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          width: '64px',
          zIndex: 2,
          flexShrink: 0
        }}
      >
        <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: `2px solid ${TimelineColor.WHITE}`,
              background: 'rgba(255, 255, 255, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'walletBlinkPulseLight 2s ease-in-out infinite',
              transition: 'all 0.2s ease'
            }}
          >
            {isAccount ? (
              <Landmark size={19} style={{ color: TimelineColor.WHITE }} />
            ) : (
              <Wallet size={19} style={{ color: TimelineColor.WHITE }} />
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: '0.74rem',
            color: TimelineColor.WHITE,
            fontWeight: '700',
            textAlign: 'center'
          }}
        >
          {isAccount ? t('flow.account') : t('flow.wallet')}
        </span>
      </div>

      {/* 🌟 4. TRILHO FLUXO RETO CARTEIRA ➔ DESTINO */}
      <div
        style={{
          flex: 1,
          height: '44px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible'
        }}
      >
        {/* Linha de trilho reta perfeitamente centralizada */}
        <div
          style={{
            position: 'absolute',
            left: '2px',
            right: '2px',
            top: '50%',
            height: '1.5px',
            transform: 'translateY(-50%)',
            background: !isInflow
              ? 'rgba(255, 255, 255, 0.28)'
              : 'rgba(255, 255, 255, 0.16)',
            borderRadius: '2px',
            transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        {/* Chuva rica de bolinhas no fluxo horizontal quando Saída */}
        {!isInflow && PARTICLES.map((p) => (
          <span
            key={p.id}
            style={{
              position: 'absolute',
              top: p.top,
              left: '0%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: TimelineColor.WHITE,
              opacity: 0,
              boxShadow: p.size > 5
                ? '0 0 6px rgba(255, 255, 255, 0.9), 0 0 2px rgba(255, 255, 255, 1)'
                : '0 0 3px rgba(255, 255, 255, 0.7)',
              animation: `linearShowerFlow ${p.duration}s cubic-bezier(0.35, 0, 0.25, 1) infinite`,
              animationDelay: `${p.delay}s`,
              animationFillMode: 'both',
              '--particle-opacity': p.opacity,
              pointerEvents: 'none'
            }}
          />
        ))}
      </div>

      {/* 🌟 5. ESTAÇÃO DIREITA: DESTINO (Bolinha dentro de um círculo igual à origem) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          width: '64px',
          zIndex: 2,
          flexShrink: 0
        }}
      >
        <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: !isInflow ? `2px solid ${TimelineColor.WHITE}` : '1.5px solid rgba(255, 255, 255, 0.35)',
              background: !isInflow ? 'rgba(255, 255, 255, 0.28)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: !isInflow ? 'focusBlinkPulseLight 1.6s ease-in-out infinite' : 'none'
            }}
          >
            {/* Bolinha interna */}
            <div
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: !isInflow ? TimelineColor.WHITE : 'rgba(255, 255, 255, 0.45)',
                transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            color: !isInflow ? TimelineColor.WHITE : 'rgba(255, 255, 255, 0.65)',
            fontWeight: !isInflow ? '700' : '500',
            transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            textAlign: 'center'
          }}
        >
          {t('flow.destination')}
        </span>
      </div>
    </div>
  );
}

import { Tooltip } from '@mantine/core';
import { useEffect } from 'react';

interface CreatureProps {
  health: number; // 0–1+
  justFed: boolean;
}

type Tier = 'critical' | 'poor' | 'okay' | 'good' | 'thriving' | 'goal';

function getTier(health: number): Tier {
  if (health >= 1) return 'goal';
  if (health >= 0.8) return 'thriving';
  if (health >= 0.6) return 'good';
  if (health >= 0.4) return 'okay';
  if (health >= 0.2) return 'poor';
  return 'critical';
}

const BODY_COLORS: Record<Tier, string> = {
  critical: 'hsl(0, 15%, 68%)',
  poor: 'hsl(20, 70%, 66%)',
  okay: 'hsl(45, 80%, 65%)',
  good: 'hsl(90, 55%, 60%)',
  thriving: 'hsl(120, 50%, 56%)',
  goal: 'hsl(50, 90%, 58%)'
};

const EAR_COLORS: Record<Tier, string> = {
  critical: 'hsl(0, 15%, 58%)',
  poor: 'hsl(20, 65%, 56%)',
  okay: 'hsl(45, 75%, 55%)',
  good: 'hsl(90, 50%, 50%)',
  thriving: 'hsl(120, 45%, 46%)',
  goal: 'hsl(50, 85%, 48%)'
};

const IDLE_ANIMATIONS: Record<Tier, string> = {
  critical: 'creature-droop 3s ease-in-out infinite',
  poor: 'creature-droop 2.5s ease-in-out infinite',
  okay: 'creature-breathe 2.2s ease-in-out infinite',
  good: 'creature-bob 1.6s ease-in-out infinite',
  thriving: 'creature-bounce 0.9s ease-in-out infinite',
  goal: 'creature-dance 1s ease-in-out infinite'
};

const TOOLTIPS: Record<Tier, string> = {
  critical: 'I feel terrible! Count some stock!',
  poor: "I'm not doing great...",
  okay: 'Feeling okay. More stocktakes please!',
  good: 'Doing well! Keep counting!',
  thriving: "I'm thriving! Great work!",
  goal: 'Goal reached! I feel amazing!'
};

const PARTICLES = [
  { angle: 0, color: '#ff6b6b' },
  { angle: 60, color: '#ffd93d' },
  { angle: 120, color: '#6bcb77' },
  { angle: 180, color: '#4d96ff' },
  { angle: 240, color: '#ff6bcb' },
  { angle: 300, color: '#ff9f43' }
];

const KEYFRAMES = `
@keyframes creature-droop {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(3px) rotate(3deg); }
}
@keyframes creature-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes creature-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes creature-bounce {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  40%  { transform: translateY(-7px) scale(0.96, 1.04); }
  55%  { transform: translateY(-8px) scale(1.04, 0.96); }
}
@keyframes creature-dance {
  0%, 100% { transform: rotate(-8deg); }
  25%  { transform: rotate(0deg) translateY(-4px); }
  50%  { transform: rotate(8deg); }
  75%  { transform: rotate(0deg) translateY(-4px); }
}
@keyframes creature-jump {
  0%   { transform: translateY(0)    scale(1, 1); }
  20%  { transform: translateY(-14px) scale(0.95, 1.05); }
  45%  { transform: translateY(-16px) scale(1.05, 0.95); }
  65%  { transform: translateY(-4px)  scale(1, 1); }
  78%  { transform: translateY(0)    scale(1.1, 0.9); }
  90%  { transform: translateY(-3px)  scale(0.98, 1.02); }
  100% { transform: translateY(0)    scale(1, 1); }
}
@keyframes creature-blink {
  0%, 88%, 100% { transform: scaleY(1); }
  93% { transform: scaleY(0.05); }
}
@keyframes creature-particle {
  0%   { opacity: 1; transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--p-dx), var(--p-dy)) scale(0); }
}
`;

const STYLE_ID = 'rolling-stocktake-creature-styles';

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID))
    return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
}

function Eyes({ tier }: { tier: Tier }) {
  if (tier === 'critical') {
    return (
      <g stroke='#444' strokeWidth='2.5' strokeLinecap='round' fill='none'>
        <line x1='21' y1='25' x2='27' y2='31' />
        <line x1='27' y1='25' x2='21' y2='31' />
        <line x1='37' y1='25' x2='43' y2='31' />
        <line x1='43' y1='25' x2='37' y2='31' />
      </g>
    );
  }
  if (tier === 'poor') {
    // droopy arcs (curve bows downward = sad lid)
    return (
      <g stroke='#444' strokeWidth='2.2' fill='none' strokeLinecap='round'>
        <path d='M 21 27 Q 24 31 27 27' />
        <path d='M 37 27 Q 40 31 43 27' />
      </g>
    );
  }
  if (tier === 'thriving' || tier === 'goal') {
    // happy squint arcs (curve bows upward)
    return (
      <g stroke='#444' strokeWidth='2.5' fill='none' strokeLinecap='round'>
        <path d='M 21 29 Q 24 24 27 29' />
        <path d='M 37 29 Q 40 24 43 29' />
      </g>
    );
  }
  return (
    <g fill='#444'>
      <circle cx='24' cy='28' r='3' />
      <circle cx='40' cy='28' r='3' />
    </g>
  );
}

function Mouth({ tier }: { tier: Tier }) {
  const p = {
    stroke: '#444',
    strokeWidth: 2.2,
    fill: 'none' as const,
    strokeLinecap: 'round' as const
  };
  switch (tier) {
    case 'critical':
      return <path d='M 22 43 Q 32 37 42 43' {...p} />;
    case 'poor':
      return <path d='M 23 41 Q 32 38 41 41' {...p} />;
    case 'okay':
      return <path d='M 23 40 L 41 40' {...p} />;
    case 'good':
      return <path d='M 23 39 Q 32 44 41 39' {...p} />;
    case 'thriving':
      return <path d='M 21 38 Q 32 46 43 38' {...p} />;
    case 'goal':
      return <path d='M 20 37 Q 32 48 44 37' {...p} />;
  }
}

export function Creature({ health, justFed }: CreatureProps) {
  useEffect(() => {
    ensureStyles();
  }, []);

  const tier = getTier(health);
  const showCheeks = tier === 'good' || tier === 'thriving' || tier === 'goal';
  const showBlink =
    tier === 'okay' ||
    tier === 'good' ||
    tier === 'thriving' ||
    tier === 'goal';

  const svgAnimation = justFed
    ? 'creature-jump 0.75s ease-out'
    : IDLE_ANIMATIONS[tier];
  const blinkAnimation = showBlink
    ? 'creature-blink 4.5s ease-in-out infinite'
    : undefined;

  return (
    <Tooltip label={TOOLTIPS[tier]} withArrow position='top'>
      <div
        style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}
      >
        {justFed &&
          PARTICLES.map((p, i) => {
            const rad = (p.angle * Math.PI) / 180;
            const dx = Math.round(Math.cos(rad) * 24);
            const dy = Math.round(Math.sin(rad) * 24);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 20,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: p.color,
                  ['--p-dx' as any]: `${dx}px`,
                  ['--p-dy' as any]: `${dy}px`,
                  animation: 'creature-particle 0.65s ease-out forwards',
                  pointerEvents: 'none'
                }}
              />
            );
          })}
        <svg
          viewBox={'0 0 64 64'}
          width={40}
          height={40}
          style={{
            display: 'block',
            animation: svgAnimation,
            transformOrigin: 'center bottom'
          }}
        >
          <title>{TOOLTIPS[tier]}</title>
          {/* Ears */}
          <circle cx='14' cy='16' r='9' fill={EAR_COLORS[tier]} />
          <circle cx='50' cy='16' r='9' fill={EAR_COLORS[tier]} />
          {/* Head */}
          <circle cx='32' cy='34' r='26' fill={BODY_COLORS[tier]} />
          {/* Blush cheeks */}
          {showCheeks && (
            <g fill='rgba(255,120,120,0.4)'>
              <ellipse cx='16' cy='38' rx='5' ry='3.5' />
              <ellipse cx='48' cy='38' rx='5' ry='3.5' />
            </g>
          )}
          {/* Eyes */}
          <g
            style={
              blinkAnimation
                ? { animation: blinkAnimation, transformOrigin: '32px 28px' }
                : undefined
            }
          >
            <Eyes tier={tier} />
          </g>
          {/* Mouth */}
          <Mouth tier={tier} />
        </svg>
      </div>
    </Tooltip>
  );
}

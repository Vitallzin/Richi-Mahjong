/** Ícones da barra de navegação da mesa (desenho próprio, traço em currentColor). */
import type { ReactNode } from 'react';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SoundIcon({ off }: { off: boolean }) {
  return (
    <Svg>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity="0.25" />
      {off ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      ) : (
        <>
          <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
          <path d="M18 6.5a7.6 7.6 0 0 1 0 11" />
        </>
      )}
    </Svg>
  );
}

export function MusicIcon({ off }: { off: boolean }) {
  return (
    <Svg>
      <path d="M9 17.5V6l10-2v11.5" />
      <circle cx="6.5" cy="17.5" r="2.5" fill="currentColor" fillOpacity="0.25" />
      <circle cx="16.5" cy="15.5" r="2.5" fill="currentColor" fillOpacity="0.25" />
      {off && <path d="M3.5 3.5l17 17" />}
    </Svg>
  );
}

export function FullscreenIcon() {
  return (
    <Svg>
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
    </Svg>
  );
}

export function ExitIcon() {
  return (
    <Svg>
      <path d="M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8" />
      <path d="M11 12h9M17 8.5l3.5 3.5-3.5 3.5" />
    </Svg>
  );
}

export function MenuIcon() {
  return (
    <Svg>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function CopyIcon() {
  return (
    <Svg>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </Svg>
  );
}

export function RulesIcon() {
  return (
    <Svg>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z" />
      <path d="M9 9h6M9 13h4" />
    </Svg>
  );
}

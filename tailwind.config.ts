import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Every colour is declared as an HSL triple in `globals.css` and consumed here through
 * `hsl(var(--token) / <alpha-value>)`. Feature code must never reference a raw hex value,
 * which is what keeps light mode, dark mode and future re-theming a single-file change.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    /**
     * The measure every page is built on.
     *
     * 1360px with 4rem gutters left roughly a fifth of a 1536px laptop screen — the
     * most common desktop size in this audience — as empty margin on either side of
     * the content. 1480px with 3rem gutters keeps the layout from running edge to
     * edge while giving that width back to the page.
     */
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', sm: '2rem', lg: '2.5rem', '2xl': '3rem' },
      screens: { '2xl': '1480px' },
    },
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          foreground: 'hsl(var(--surface-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          hover: 'hsl(var(--primary-hover) / <alpha-value>)',
        },
        /** Decorative gold. Not permitted for small text — use `gold-ink`. */
        gold: {
          DEFAULT: 'hsl(var(--gold) / <alpha-value>)',
          soft: 'hsl(var(--gold-soft) / <alpha-value>)',
          ink: 'hsl(var(--gold-ink) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Fluid display scale — the hero never needs breakpoint-specific sizes.
        'display-2xl': ['clamp(3.25rem, 9vw, 8rem)', { lineHeight: '0.95', letterSpacing: '0.01em' }],
        'display-xl': ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '1.02', letterSpacing: '0.005em' }],
        'display-lg': ['clamp(2rem, 4.2vw, 3.5rem)', { lineHeight: '1.1' }],
        'display-md': ['clamp(1.65rem, 3vw, 2.5rem)', { lineHeight: '1.15' }],
        'display-sm': ['clamp(1.35rem, 2.2vw, 1.875rem)', { lineHeight: '1.25' }],
        kicker: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.22em' }],
        eyebrow: ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.16em' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        card: '1rem',
        media: '1.25rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        gold: 'var(--shadow-gold)',
      },
      spacing: {
        13: '3.25rem',
        section: 'clamp(5rem, 10vw, 9rem)',
        'section-sm': 'clamp(3.5rem, 6vw, 5.5rem)',
        /** Header height, shared by the sticky header and the scroll-margin offset. */
        header: '5rem',
      },
      backgroundImage: {
        'gold-gradient':
          'linear-gradient(100deg, hsl(var(--gold-soft)) 0%, hsl(var(--gold)) 45%, hsl(var(--gold-ink)) 100%)',
        /**
         * Left-to-right veil over the hero photograph. The stops are tuned so the
         * headline — which runs to roughly 65% of the viewport at desktop widths —
         * still sits on a near-opaque canvas, while the Registan and the sunset on the
         * right stay untouched.
         */
        'hero-veil':
          'linear-gradient(96deg, hsl(var(--background)) 0%, hsl(var(--background) / 0.97) 38%, hsl(var(--background) / 0.82) 55%, hsl(var(--background) / 0.28) 72%, transparent 88%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'marquee-x': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.24s ease-out',
        'accordion-up': 'accordion-up 0.24s ease-out',
        marquee: 'marquee-x var(--marquee-duration, 40s) linear infinite',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  // ESM imports, not `require()`: Node loads this `.ts` config through the ESM loader,
  // where `require` is not defined — it crashes `next dev` on the first CSS compile.
  plugins: [animate, typography],
};

export default config;

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontSize: {
        /** 10px — micro labels (avatar fallbacks, section dividers) */
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        /** 11px — uppercase status / meta beside tokens */
        "2xs-plus": ["0.6875rem", { lineHeight: "0.875rem" }],
      },
      spacing: {
        /** 168px — collection feed mosaic tile (2×2 preview grid) */
        "collection-mosaic": "10.5rem",
        /** 1.5px — hairline gutter between mosaic cells */
        "mosaic-gap": "1.5px",
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        border: "var(--border-default)",
        input: "var(--border-default)",
        ring: "var(--brand-primary)",
        background: "var(--surface-default)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--brand-primary)",
          foreground: "var(--brand-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--surface-muted)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--feedback-destructive)",
          foreground: "var(--feedback-destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--surface-muted)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "var(--brand-secondary)",
          foreground: "var(--brand-secondary-foreground)",
        },
        popover: {
          DEFAULT: "var(--surface-overlay)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--surface-card)",
          foreground: "var(--text-primary)",
        },
        sidebar: {
          DEFAULT:              "var(--surface-muted)",
          foreground:           "var(--text-primary)",
          primary:              "var(--brand-primary)",
          "primary-foreground": "var(--brand-primary-foreground)",
          accent:               "var(--brand-secondary)",
          "accent-foreground":  "var(--brand-secondary-foreground)",
          border:               "var(--border-default)",
          ring:                 "var(--brand-primary)",
        },
        lime: {
          high: "#eeff41",
          DEFAULT: "#eeff41",
        },
        /* Plano semantic tokens */
        'brand-primary':              'var(--brand-primary)',
        'brand-primary-hover':        'var(--brand-primary-hover)',
        'brand-primary-foreground':   'var(--brand-primary-foreground)',
        'brand-secondary':            'var(--brand-secondary)',
        'brand-secondary-foreground': 'var(--brand-secondary-foreground)',
        'surface-default':            'var(--surface-default)',
        'surface-card':               'var(--surface-card)',
        'surface-overlay':            'var(--surface-overlay)',
        'surface-muted':              'var(--surface-muted)',
        'border-default':             'var(--border-default)',
        'border-strong':              'var(--border-strong)',
        'text-primary':               'var(--text-primary)',
        'text-secondary':             'var(--text-secondary)',
        'text-disabled':              'var(--text-disabled)',
        'text-inverse':               'var(--text-inverse)',
        'feedback-success':           'var(--feedback-success)',
        'feedback-warning':           'var(--feedback-warning)',
        'feedback-destructive':            'var(--feedback-destructive)',
        'feedback-destructive-foreground': 'var(--feedback-destructive-foreground)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "ping-large-slow": {
          "75%, 100%": {
            transform: "scale(1.5)",
            opacity: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ping-large-slow": "ping-large-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

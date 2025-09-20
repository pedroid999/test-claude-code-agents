import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
		colors: {
			background: "hsl(var(--background))",
			foreground: "hsl(var(--foreground))",
			card: "hsl(var(--background))",
			"card-foreground": "hsl(var(--card-foreground))",
			popover: "hsl(var(--popover))",
			"popover-foreground": "hsl(var(--popover-foreground))",
			primary: "hsl(var(--primary))",
			"primary-foreground": "hsl(var(--primary-foreground))",
			secondary: "hsl(var(--secondary))",
			"secondary-foreground": "hsl(var(--secondary-foreground))",
			muted: "hsl(var(--muted))",
			"muted-foreground": "hsl(var(--muted-foreground))",
			accent: "hsl(var(--accent))",
			"accent-foreground": "hsl(var(--accent-foreground))",
			destructive: "hsl(var(--destructive))",
			"destructive-foreground": "hsl(var(--destructive-foreground))",
			border: "hsl(var(--border))",
			input: "hsl(var(--input))",
			ring: "hsl(var(--ring))",
		  },
		  borderRadius: {
			lg: "var(--radius)",
		  },
		keyframes: {
			pulse: {
				'0%': {
					transform: 'scale(0.98)',
				},
				'70%': {
					transform: 'scale(1)',
				},
				'100%': {
					transform: 'scale(0.98)',
				}
			},
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},
			"grow-line": {
				from: { width: 0 },
				to: { width: '100%' }
			  }
		},
		animation: {
			'pulse-loop': 'pulse 1s infinite ease-in-out',
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			"grow-line": "grow-line 0.7s ease-out forwards"
		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)'
		}
	},
  },
  plugins: [animate, require("tailwindcss-animate")],
};

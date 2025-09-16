// Design constants for consistent styling across the homepage

export const COLORS = {
  brand: {
    orange: {
      primary: 'lichess-orange-500',
      hover: 'lichess-orange-600',
      light: 'lichess-orange-500/10',
      border: 'lichess-orange-500/20'
    },
    green: {
      primary: 'lichess-green-500',
      hover: 'lichess-green-600'
    }
  },
  background: {
    secondary: 'background-secondary',
    tertiary: 'background-tertiary',
    subtle: 'background-subtle'
  },
  text: {
    foreground: 'foreground',
    muted: 'foreground-muted',
    subtle: 'foreground-subtle'
  }
} as const;

export const SHADOWS = {
  lg: 'shadow-lg hover:shadow-xl',
  md: 'hover:shadow-md',
  xl: 'shadow-xl'
} as const;

export const SPACING = {
  section: 'space-y-12',
  sectionPadding: 'pb-12',
  cardPadding: 'p-6',
  smallCardPadding: 'p-4'
} as const;

export const GRADIENTS = {
  orangeLight: 'bg-gradient-to-br from-lichess-orange-500/10 to-lichess-orange-600/5'
} as const;

export const BORDERS = {
  orangeLight: 'border border-lichess-orange-500/20'
} as const;

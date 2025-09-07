"use client";

// Advanced Gradient System with Dynamic Color Transitions and Themes

export type GradientTheme = 'default' | 'warm' | 'cool' | 'vibrant' | 'monochrome' | 'neon';
export type GradientIntensity = 'subtle' | 'medium' | 'bold' | 'extreme';
export type GradientDirection = 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl' | 'to-tr' | 'to-tl';

// Base color palettes for different themes
const THEME_PALETTES = {
  default: {
    primary: ['slate-500', 'slate-600', 'slate-700'],
    secondary: ['blue-500', 'blue-600', 'blue-700'],
    accent: ['purple-500', 'purple-600', 'purple-700'],
    success: ['emerald-500', 'emerald-600', 'emerald-700'],
    warning: ['amber-500', 'amber-600', 'amber-700'],
    danger: ['red-500', 'red-600', 'red-700'],
  },
  warm: {
    primary: ['orange-400', 'red-500', 'pink-600'],
    secondary: ['yellow-400', 'orange-500', 'red-600'],
    accent: ['pink-400', 'rose-500', 'red-600'],
    success: ['lime-400', 'green-500', 'emerald-600'],
    warning: ['yellow-400', 'amber-500', 'orange-600'],
    danger: ['red-400', 'red-500', 'red-600'],
  },
  cool: {
    primary: ['cyan-400', 'blue-500', 'indigo-600'],
    secondary: ['teal-400', 'cyan-500', 'blue-600'],
    accent: ['indigo-400', 'purple-500', 'violet-600'],
    success: ['teal-400', 'emerald-500', 'green-600'],
    warning: ['blue-400', 'indigo-500', 'purple-600'],
    danger: ['violet-400', 'purple-500', 'pink-600'],
  },
  vibrant: {
    primary: ['fuchsia-400', 'purple-500', 'indigo-600'],
    secondary: ['pink-400', 'rose-500', 'red-600'],
    accent: ['violet-400', 'purple-500', 'fuchsia-600'],
    success: ['lime-400', 'emerald-500', 'teal-600'],
    warning: ['yellow-400', 'orange-500', 'red-600'],
    danger: ['red-400', 'pink-500', 'fuchsia-600'],
  },
  monochrome: {
    primary: ['gray-400', 'gray-500', 'gray-600'],
    secondary: ['slate-400', 'slate-500', 'slate-600'],
    accent: ['zinc-400', 'zinc-500', 'zinc-600'],
    success: ['gray-400', 'gray-500', 'gray-600'],
    warning: ['slate-400', 'slate-500', 'slate-600'],
    danger: ['zinc-400', 'zinc-500', 'zinc-600'],
  },
  neon: {
    primary: ['cyan-300', 'cyan-400', 'cyan-500'],
    secondary: ['lime-300', 'lime-400', 'lime-500'],
    accent: ['pink-300', 'pink-400', 'pink-500'],
    success: ['green-300', 'green-400', 'green-500'],
    warning: ['yellow-300', 'yellow-400', 'yellow-500'],
    danger: ['red-300', 'red-400', 'red-500'],
  },
} as const;

// Intensity modifiers
const INTENSITY_MODIFIERS = {
  subtle: { opacity: '20', saturation: '40' },
  medium: { opacity: '40', saturation: '60' },
  bold: { opacity: '60', saturation: '80' },
  extreme: { opacity: '80', saturation: '100' },
} as const;

// Advanced gradient generator
export class GradientBuilder {
  private theme: GradientTheme = 'default';
  private intensity: GradientIntensity = 'medium';
  private direction: GradientDirection = 'to-br';
  private animated: boolean = false;
  private withShadow: boolean = false;
  private withBorder: boolean = false;

  setTheme(theme: GradientTheme): this {
    this.theme = theme;
    return this;
  }

  setIntensity(intensity: GradientIntensity): this {
    this.intensity = intensity;
    return this;
  }

  setDirection(direction: GradientDirection): this {
    this.direction = direction;
    return this;
  }

  setAnimated(animated: boolean = true): this {
    this.animated = animated;
    return this;
  }

  setShadow(withShadow: boolean = true): this {
    this.withShadow = withShadow;
    return this;
  }

  setBorder(withBorder: boolean = true): this {
    this.withBorder = withBorder;
    return this;
  }

  // Generate gradient for specific color type
  build(colorType: keyof typeof THEME_PALETTES.default): string {
    const palette = THEME_PALETTES[this.theme][colorType];
    const modifier = INTENSITY_MODIFIERS[this.intensity];
    
    const baseGradient = `bg-gradient-${this.direction} from-${palette[0]}/${modifier.opacity} via-${palette[1]}/${modifier.saturation} to-${palette[2]}/${modifier.opacity}`;
    
    const classes = [baseGradient];
    
    if (this.withShadow) {
      classes.push(`shadow-lg shadow-${palette[1]}/20`);
    }
    
    if (this.withBorder) {
      classes.push(`border border-${palette[1]}/30`);
    }
    
    if (this.animated) {
      classes.push('animate-gradient-x');
    }
    
    return classes.join(' ');
  }

  // Generate text gradient
  buildText(colorType: keyof typeof THEME_PALETTES.default): string {
    const palette = THEME_PALETTES[this.theme][colorType];
    return `bg-gradient-${this.direction} from-${palette[0]} via-${palette[1]} to-${palette[2]} bg-clip-text text-transparent`;
  }

  // Generate hover gradient
  buildHover(colorType: keyof typeof THEME_PALETTES.default): string {
    const palette = THEME_PALETTES[this.theme][colorType];
    const modifier = INTENSITY_MODIFIERS[this.intensity];
    
    return `hover:bg-gradient-${this.direction} hover:from-${palette[0]}/${modifier.saturation} hover:via-${palette[1]}/${modifier.opacity} hover:to-${palette[2]}/${modifier.saturation}`;
  }
}

// Convenience function to create gradient builder
export const gradient = () => new GradientBuilder();

// Pre-built gradient sets for common use cases
export const GRADIENT_PRESETS = {
  // Status gradients
  status: {
    pending: gradient().setTheme('warm').setIntensity('medium').build('warning'),
    in_progress: gradient().setTheme('cool').setIntensity('medium').build('secondary'),
    pending_review: gradient().setTheme('vibrant').setIntensity('medium').build('accent'),
    done: gradient().setTheme('cool').setIntensity('medium').build('success'),
  },
  
  // Priority gradients
  priority: {
    urgent: gradient().setTheme('warm').setIntensity('bold').setShadow().build('danger'),
    high: gradient().setTheme('warm').setIntensity('medium').build('warning'),
    medium: gradient().setTheme('cool').setIntensity('medium').build('secondary'),
    low: gradient().setTheme('cool').setIntensity('subtle').build('primary'),
  },
  
  // Interactive gradients
  interactive: {
    button: gradient().setTheme('vibrant').setIntensity('medium').setShadow().setBorder().build('accent'),
    buttonHover: gradient().setTheme('vibrant').setIntensity('bold').setShadow().setBorder().buildHover('accent'),
    card: gradient().setTheme('default').setIntensity('subtle').build('primary'),
    cardHover: gradient().setTheme('cool').setIntensity('medium').buildHover('secondary'),
  },
  
  // Background gradients
  background: {
    page: gradient().setTheme('monochrome').setIntensity('subtle').setDirection('to-br').build('primary'),
    section: gradient().setTheme('default').setIntensity('subtle').setDirection('to-r').build('secondary'),
    modal: gradient().setTheme('default').setIntensity('medium').setDirection('to-br').build('primary'),
  },
  
  // Text gradients
  text: {
    heading: gradient().setTheme('vibrant').setDirection('to-r').buildText('accent'),
    subheading: gradient().setTheme('cool').setDirection('to-r').buildText('secondary'),
    accent: gradient().setTheme('warm').setDirection('to-r').buildText('warning'),
  },
} as const;

// Dynamic gradient based on data
export const getDynamicGradient = (
  value: number,
  min: number,
  max: number,
  theme: GradientTheme = 'default'
): string => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  
  if (percentage < 25) {
    return gradient().setTheme(theme).setIntensity('subtle').build('danger');
  } else if (percentage < 50) {
    return gradient().setTheme(theme).setIntensity('medium').build('warning');
  } else if (percentage < 75) {
    return gradient().setTheme(theme).setIntensity('medium').build('secondary');
  } else {
    return gradient().setTheme(theme).setIntensity('bold').build('success');
  }
};

// Animated gradient keyframes (to be added to CSS)
export const GRADIENT_ANIMATIONS = `
@keyframes gradient-x {
  0%, 100% {
    background-size: 200% 200%;
    background-position: left center;
  }
  50% {
    background-size: 200% 200%;
    background-position: right center;
  }
}

@keyframes gradient-y {
  0%, 100% {
    background-size: 200% 200%;
    background-position: center top;
  }
  50% {
    background-size: 200% 200%;
    background-position: center bottom;
  }
}

@keyframes gradient-xy {
  0%, 100% {
    background-size: 400% 400%;
    background-position: left center;
  }
  25% {
    background-size: 400% 400%;
    background-position: center top;
  }
  50% {
    background-size: 400% 400%;
    background-position: right center;
  }
  75% {
    background-size: 400% 400%;
    background-position: center bottom;
  }
}

.animate-gradient-x {
  animation: gradient-x 3s ease infinite;
}

.animate-gradient-y {
  animation: gradient-y 3s ease infinite;
}

.animate-gradient-xy {
  animation: gradient-xy 4s ease infinite;
}
`;

// Theme-aware gradient utilities
export const getThemeGradients = (theme: GradientTheme) => {
  return {
    primary: gradient().setTheme(theme).build('primary'),
    secondary: gradient().setTheme(theme).build('secondary'),
    accent: gradient().setTheme(theme).build('accent'),
    success: gradient().setTheme(theme).build('success'),
    warning: gradient().setTheme(theme).build('warning'),
    danger: gradient().setTheme(theme).build('danger'),
  };
};

// Responsive gradient utilities
export const getResponsiveGradient = (
  mobile: string,
  tablet: string,
  desktop: string
): string => {
  return `${mobile} md:${tablet} lg:${desktop}`;
};

// Gradient with custom stops
export const createCustomGradient = (
  direction: GradientDirection,
  stops: Array<{ color: string; position?: string; opacity?: string }>
): string => {
  const stopClasses = stops.map((stop, index) => {
    const position = stop.position || (index === 0 ? 'from' : index === stops.length - 1 ? 'to' : 'via');
    const opacity = stop.opacity ? `/${stop.opacity}` : '';
    return `${position}-${stop.color}${opacity}`;
  }).join(' ');
  
  return `bg-gradient-${direction} ${stopClasses}`;
};

export default gradient;
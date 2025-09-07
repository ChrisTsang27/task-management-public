"use client";

// Advanced Typography System with Dynamic Font Effects and Sophisticated Hierarchy

export type TypographyVariant = 
  | 'display-xl' | 'display-lg' | 'display-md' | 'display-sm'
  | 'heading-xl' | 'heading-lg' | 'heading-md' | 'heading-sm'
  | 'title-xl' | 'title-lg' | 'title-md' | 'title-sm'
  | 'body-xl' | 'body-lg' | 'body-md' | 'body-sm'
  | 'caption-lg' | 'caption-md' | 'caption-sm'
  | 'overline' | 'code' | 'mono';

export type TypographyWeight = 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
export type TypographyEffect = 'none' | 'glow' | 'shadow' | 'gradient' | 'outline' | 'emboss' | 'neon' | 'glitch';
export type TypographyAnimation = 'none' | 'fade-in' | 'slide-up' | 'typewriter' | 'wave' | 'pulse' | 'bounce' | 'shimmer';

// Typography scale configuration
const TYPOGRAPHY_SCALE = {
  'display-xl': {
    fontSize: 'text-8xl',
    lineHeight: 'leading-none',
    letterSpacing: 'tracking-tighter',
    fontWeight: 'font-black',
  },
  'display-lg': {
    fontSize: 'text-7xl',
    lineHeight: 'leading-none',
    letterSpacing: 'tracking-tighter',
    fontWeight: 'font-extrabold',
  },
  'display-md': {
    fontSize: 'text-6xl',
    lineHeight: 'leading-tight',
    letterSpacing: 'tracking-tight',
    fontWeight: 'font-bold',
  },
  'display-sm': {
    fontSize: 'text-5xl',
    lineHeight: 'leading-tight',
    letterSpacing: 'tracking-tight',
    fontWeight: 'font-bold',
  },
  'heading-xl': {
    fontSize: 'text-4xl',
    lineHeight: 'leading-tight',
    letterSpacing: 'tracking-tight',
    fontWeight: 'font-bold',
  },
  'heading-lg': {
    fontSize: 'text-3xl',
    lineHeight: 'leading-snug',
    letterSpacing: 'tracking-tight',
    fontWeight: 'font-semibold',
  },
  'heading-md': {
    fontSize: 'text-2xl',
    lineHeight: 'leading-snug',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-semibold',
  },
  'heading-sm': {
    fontSize: 'text-xl',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-medium',
  },
  'title-xl': {
    fontSize: 'text-lg',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-semibold',
  },
  'title-lg': {
    fontSize: 'text-base',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-semibold',
  },
  'title-md': {
    fontSize: 'text-sm',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-medium',
  },
  'title-sm': {
    fontSize: 'text-xs',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-wide',
    fontWeight: 'font-medium',
  },
  'body-xl': {
    fontSize: 'text-lg',
    lineHeight: 'leading-relaxed',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-normal',
  },
  'body-lg': {
    fontSize: 'text-base',
    lineHeight: 'leading-relaxed',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-normal',
  },
  'body-md': {
    fontSize: 'text-sm',
    lineHeight: 'leading-relaxed',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-normal',
  },
  'body-sm': {
    fontSize: 'text-xs',
    lineHeight: 'leading-relaxed',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-normal',
  },
  'caption-lg': {
    fontSize: 'text-sm',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-wide',
    fontWeight: 'font-normal',
  },
  'caption-md': {
    fontSize: 'text-xs',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-wide',
    fontWeight: 'font-normal',
  },
  'caption-sm': {
    fontSize: 'text-xs',
    lineHeight: 'leading-tight',
    letterSpacing: 'tracking-wider',
    fontWeight: 'font-light',
  },
  'overline': {
    fontSize: 'text-xs',
    lineHeight: 'leading-tight',
    letterSpacing: 'tracking-widest',
    fontWeight: 'font-semibold',
  },
  'code': {
    fontSize: 'text-sm',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-mono',
  },
  'mono': {
    fontSize: 'text-sm',
    lineHeight: 'leading-normal',
    letterSpacing: 'tracking-normal',
    fontWeight: 'font-mono',
  },
} as const;

// Typography effects
const TYPOGRAPHY_EFFECTS = {
  none: '',
  glow: 'text-shadow-glow',
  shadow: 'drop-shadow-lg',
  gradient: 'gradient-text-glow',
  outline: 'text-stroke',
  emboss: 'text-emboss',
  neon: 'text-neon',
  glitch: 'text-glitch',
} as const;

// Typography animations
const TYPOGRAPHY_ANIMATIONS = {
  none: '',
  'fade-in': 'animate-fade-in',
  'slide-up': 'animate-slide-up',
  'typewriter': 'animate-typewriter',
  'wave': 'animate-text-wave',
  'pulse': 'animate-pulse',
  'bounce': 'animate-bounce',
  'shimmer': 'animate-text-shimmer',
} as const;

// Advanced typography builder
export class TypographyBuilder {
  private variant: TypographyVariant = 'body-md';
  private weight?: TypographyWeight;
  private effect: TypographyEffect = 'none';
  private animation: TypographyAnimation = 'none';
  private color?: string;
  private responsive: boolean = false;
  private truncate: boolean = false;
  private uppercase: boolean = false;
  private italic: boolean = false;

  setVariant(variant: TypographyVariant): this {
    this.variant = variant;
    return this;
  }

  setWeight(weight: TypographyWeight): this {
    this.weight = weight;
    return this;
  }

  setEffect(effect: TypographyEffect): this {
    this.effect = effect;
    return this;
  }

  setAnimation(animation: TypographyAnimation): this {
    this.animation = animation;
    return this;
  }

  setColor(color: string): this {
    this.color = color;
    return this;
  }

  setResponsive(responsive: boolean = true): this {
    this.responsive = responsive;
    return this;
  }

  setTruncate(truncate: boolean = true): this {
    this.truncate = truncate;
    return this;
  }

  setUppercase(uppercase: boolean = true): this {
    this.uppercase = uppercase;
    return this;
  }

  setItalic(italic: boolean = true): this {
    this.italic = italic;
    return this;
  }

  build(): string {
    const scale = TYPOGRAPHY_SCALE[this.variant];
    const classes = [];

    // Base typography classes
    classes.push(scale.fontSize);
    classes.push(scale.lineHeight);
    classes.push(scale.letterSpacing);
    
    // Font weight (override default if specified)
    if (this.weight) {
      classes.push(`font-${this.weight}`);
    } else {
      classes.push(scale.fontWeight);
    }

    // Color
    if (this.color) {
      classes.push(this.color);
    }

    // Effects
    if (this.effect !== 'none') {
      classes.push(TYPOGRAPHY_EFFECTS[this.effect]);
    }

    // Animations
    if (this.animation !== 'none') {
      classes.push(TYPOGRAPHY_ANIMATIONS[this.animation]);
    }

    // Modifiers
    if (this.truncate) {
      classes.push('truncate');
    }
    if (this.uppercase) {
      classes.push('uppercase');
    }
    if (this.italic) {
      classes.push('italic');
    }

    // Responsive adjustments
    if (this.responsive) {
      classes.push('transition-all duration-300');
    }

    return classes.join(' ');
  }

  // Build with responsive breakpoints
  buildResponsive(mobile: TypographyVariant, tablet?: TypographyVariant, desktop?: TypographyVariant): string {
    const mobileBuilder = new TypographyBuilder().setVariant(mobile);
    if (this.weight) mobileBuilder.setWeight(this.weight);
    if (this.effect) mobileBuilder.setEffect(this.effect);
    if (this.animation) mobileBuilder.setAnimation(this.animation);
    if (this.color) mobileBuilder.setColor(this.color);
    const mobileClasses = mobileBuilder.build();

    let responsiveClasses = mobileClasses;

    if (tablet) {
      const tabletBuilder = new TypographyBuilder().setVariant(tablet);
      if (this.weight) tabletBuilder.setWeight(this.weight);
      if (this.effect) tabletBuilder.setEffect(this.effect);
      if (this.animation) tabletBuilder.setAnimation(this.animation);
      if (this.color) tabletBuilder.setColor(this.color);
      const tabletClasses = tabletBuilder.build();
      responsiveClasses += ` md:${tabletClasses}`;
    }

    if (desktop) {
      const desktopBuilder = new TypographyBuilder().setVariant(desktop);
      if (this.weight) desktopBuilder.setWeight(this.weight);
      if (this.effect) desktopBuilder.setEffect(this.effect);
      if (this.animation) desktopBuilder.setAnimation(this.animation);
      if (this.color) desktopBuilder.setColor(this.color);
      const desktopClasses = desktopBuilder.build();
      responsiveClasses += ` lg:${desktopClasses}`;
    }

    return responsiveClasses;
  }
}

// Convenience function to create typography builder
export const typography = () => new TypographyBuilder();

// Pre-built typography presets
export const TYPOGRAPHY_PRESETS = {
  // Hero text
  hero: {
    primary: typography().setVariant('display-xl').setWeight('black').setEffect('gradient').setAnimation('fade-in').build(),
    secondary: typography().setVariant('heading-lg').setWeight('medium').setColor('text-slate-300').setAnimation('slide-up').build(),
  },
  
  // Page headings
  heading: {
    h1: typography().setVariant('heading-xl').setWeight('bold').setEffect('glow').build(),
    h2: typography().setVariant('heading-lg').setWeight('semibold').build(),
    h3: typography().setVariant('heading-md').setWeight('semibold').build(),
    h4: typography().setVariant('heading-sm').setWeight('medium').build(),
  },
  
  // Content text
  content: {
    lead: typography().setVariant('body-xl').setWeight('normal').setColor('text-slate-200').build(),
    body: typography().setVariant('body-md').setWeight('normal').setColor('text-slate-300').build(),
    small: typography().setVariant('body-sm').setWeight('normal').setColor('text-slate-400').build(),
  },
  
  // UI elements
  ui: {
    button: typography().setVariant('title-md').setWeight('semibold').setUppercase().build(),
    label: typography().setVariant('caption-md').setWeight('medium').setColor('text-slate-400').setUppercase().build(),
    badge: typography().setVariant('caption-sm').setWeight('semibold').setUppercase().build(),
    tooltip: typography().setVariant('caption-sm').setWeight('normal').setColor('text-slate-200').build(),
  },
  
  // Special effects
  special: {
    neon: typography().setVariant('heading-lg').setWeight('bold').setEffect('neon').setAnimation('pulse').build(),
    glitch: typography().setVariant('title-lg').setWeight('bold').setEffect('glitch').setAnimation('shimmer').build(),
    typewriter: typography().setVariant('mono').setWeight('normal').setAnimation('typewriter').build(),
    gradient: typography().setVariant('heading-md').setWeight('bold').setEffect('gradient').setAnimation('wave').build(),
  },
  
  // Status text
  status: {
    success: typography().setVariant('body-sm').setWeight('semibold').setColor('text-green-400').setEffect('glow').build(),
    warning: typography().setVariant('body-sm').setWeight('semibold').setColor('text-yellow-400').setEffect('glow').build(),
    error: typography().setVariant('body-sm').setWeight('semibold').setColor('text-red-400').setEffect('glow').build(),
    info: typography().setVariant('body-sm').setWeight('semibold').setColor('text-blue-400').setEffect('glow').build(),
  },
} as const;

// Dynamic typography based on context
export const getContextualTypography = (
  context: 'primary' | 'secondary' | 'accent' | 'muted',
  variant: TypographyVariant = 'body-md'
): string => {
  const builder = typography().setVariant(variant);
  
  switch (context) {
    case 'primary':
      return builder.setColor('text-white').setWeight('semibold').setEffect('glow').build();
    case 'secondary':
      return builder.setColor('text-slate-200').setWeight('medium').build();
    case 'accent':
      return builder.setColor('text-blue-400').setWeight('semibold').setEffect('gradient').build();
    case 'muted':
      return builder.setColor('text-slate-400').setWeight('normal').build();
    default:
      return builder.build();
  }
};

// Animated text reveal
export const createTextReveal = (text: string, delay: number = 0): string => {
  return `animate-text-reveal animation-delay-${delay}`;
};

// Typography animations CSS (to be added to globals.css)
export const TYPOGRAPHY_ANIMATIONS_CSS = `
/* Typography Animations */
@keyframes text-wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes text-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes text-reveal {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes text-glitch {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
}

/* Typography Effect Classes */
.text-shadow-glow {
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.3);
}

.text-emboss {
  text-shadow: 1px 1px 0px rgba(255, 255, 255, 0.1), -1px -1px 0px rgba(0, 0, 0, 0.5);
}

.text-neon {
  color: #fff;
  text-shadow: 
    0 0 5px currentColor,
    0 0 10px currentColor,
    0 0 15px currentColor,
    0 0 20px #00ffff,
    0 0 35px #00ffff,
    0 0 40px #00ffff;
}

.text-stroke {
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
  text-stroke: 1px rgba(255, 255, 255, 0.3);
}

.text-glitch {
  animation: text-glitch 0.3s infinite;
}

.animate-text-wave {
  animation: text-wave 2s ease-in-out infinite;
}

.animate-text-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  background-size: 200% 100%;
  animation: text-shimmer 2s infinite;
  background-clip: text;
  -webkit-background-clip: text;
}

.animate-typewriter {
  overflow: hidden;
  border-right: 2px solid;
  white-space: nowrap;
  animation: typewriter 3s steps(40, end), blink-caret 0.75s step-end infinite;
}

.animate-text-reveal {
  animation: text-reveal 0.6s ease-out forwards;
}

@keyframes blink-caret {
  from, to { border-color: transparent; }
  50% { border-color: currentColor; }
}

/* Responsive typography utilities */
.text-responsive {
  transition: font-size 0.3s ease, line-height 0.3s ease;
}

/* Animation delays */
.animation-delay-100 { animation-delay: 100ms; }
.animation-delay-200 { animation-delay: 200ms; }
.animation-delay-300 { animation-delay: 300ms; }
.animation-delay-400 { animation-delay: 400ms; }
.animation-delay-500 { animation-delay: 500ms; }
`;

// Font loading optimization
export const optimizeFontLoading = () => {
  if (typeof window !== 'undefined') {
    // Preload critical fonts
    const fontPreloads = [
      '/fonts/inter-var.woff2',
      '/fonts/jetbrains-mono.woff2',
    ];
    
    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
};

export default typography;
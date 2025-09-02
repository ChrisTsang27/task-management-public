import React, { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { createRoot } from 'react-dom/client';

interface CursorOptions {
  size?: number;
  color?: string;
  strokeWidth?: number;
  hotspotX?: number;
  hotspotY?: number;
}

interface DualCursorOptions extends CursorOptions {
  hoverIcon?: LucideIcon | null;
  hoverColor?: string;
  hoverSize?: number;
  hoverStrokeWidth?: number;
}

export function useLucideCursor<T extends HTMLElement = HTMLElement>(
  IconComponent: LucideIcon | null,
  options: CursorOptions = {}
) {
  const elementRef = useRef<T>(null);
  const {
    size = 20,
    color = '#ffffff',
    strokeWidth = 2,
    hotspotX = 0,
    hotspotY = 0
  } = options;

  useEffect(() => {
    if (!IconComponent || !elementRef.current) return;

    const element = elementRef.current;
    
    // Create SVG directly using the icon component
    const createSVGFromIcon = () => {
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Create root and render the icon
      const root = createRoot(tempContainer);
      
      // Use a Promise to handle async rendering
      return new Promise<void>((resolve) => {
        root.render(
          React.createElement(IconComponent, {
            size: size,
            color: color,
            strokeWidth: strokeWidth
          })
        );

        // Multiple attempts to find the SVG
        let attempts = 0;
        const checkForSVG = () => {
          const svgElement = tempContainer.querySelector('svg');
          
          if (svgElement) {
            // Ensure SVG has proper attributes for cursor usage
            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgElement.setAttribute('width', size.toString());
            svgElement.setAttribute('height', size.toString());
            
            // Convert SVG to data URL
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const encodedSvg = encodeURIComponent(svgData);
            const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
            
            // Apply cursor with fallback
            element.style.cursor = `url("${dataUrl}") ${hotspotX} ${hotspotY}, pointer`;
            
            // Cleanup
            root.unmount();
            document.body.removeChild(tempContainer);
            resolve();
          } else if (attempts < 10) {
            attempts++;
            setTimeout(checkForSVG, 10);
          } else {
            // Fallback: cleanup and use default cursor
            root.unmount();
            document.body.removeChild(tempContainer);
            element.style.cursor = 'pointer';
            resolve();
          }
        };
        
        // Start checking after a brief delay
        setTimeout(checkForSVG, 10);
      });
    };

    createSVGFromIcon();

    // Cleanup function
    return () => {
      if (element) {
        element.style.cursor = '';
      }
    };
  }, [IconComponent, size, color, strokeWidth, hotspotX, hotspotY]);

  return elementRef;
}

// Helper hook for applying cursor to body
export function useGlobalLucideCursor(
  IconComponent: LucideIcon | null,
  options: CursorOptions = {}
) {
  useEffect(() => {
    if (!IconComponent) {
      document.body.style.cursor = 'default';
      return;
    }

    const {
      size = 20,
      color = '#ffffff',
      strokeWidth = 2,
      hotspotX = 0,
      hotspotY = 0
    } = options;

    // Create SVG directly using the icon component
    const createSVGFromIcon = () => {
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Create root and render the icon
      const root = createRoot(tempContainer);
      
      // Use a Promise to handle async rendering
      return new Promise<void>((resolve) => {
        root.render(
          React.createElement(IconComponent, {
            size: size,
            color: color,
            strokeWidth: strokeWidth
          })
        );

        // Multiple attempts to find the SVG
        let attempts = 0;
        const checkForSVG = () => {
          const svgElement = tempContainer.querySelector('svg');
          
          if (svgElement) {
            // Ensure SVG has proper attributes for cursor usage
            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgElement.setAttribute('width', size.toString());
            svgElement.setAttribute('height', size.toString());
            
            // Convert SVG to data URL
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const encodedSvg = encodeURIComponent(svgData);
            const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
            
            // Apply cursor to body with fallback
            document.body.style.cursor = `url("${dataUrl}") ${hotspotX} ${hotspotY}, default`;
            
            // Cleanup
            root.unmount();
            document.body.removeChild(tempContainer);
            resolve();
          } else if (attempts < 10) {
            attempts++;
            setTimeout(checkForSVG, 10);
          } else {
            // Fallback: cleanup and use default cursor
            root.unmount();
            document.body.removeChild(tempContainer);
            document.body.style.cursor = 'default';
            resolve();
          }
        };
        
        // Start checking after a brief delay
        setTimeout(checkForSVG, 10);
      });
    };

    createSVGFromIcon();

    // Cleanup function
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [IconComponent, options]);
}

// Hook for dual cursor states (default and hover)
export function useDualLucideCursor<T extends HTMLElement = HTMLElement>(
  defaultIcon: LucideIcon | null,
  options: DualCursorOptions = {}
) {
  const elementRef = useRef<T>(null);
  const {
    size = 20,
    color = '#ffffff',
    strokeWidth = 2,
    hotspotX = 0,
    hotspotY = 0,
    hoverIcon = null,
    hoverColor = color,
    hoverSize = size,
    hoverStrokeWidth = strokeWidth
  } = options;

  useEffect(() => {
    if (!defaultIcon || !elementRef.current) return;

    const element = elementRef.current;
    let defaultCursor = '';
    let hoverCursor = '';

    // Create cursor for default state
    const createDefaultCursor = () => {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      const root = createRoot(tempContainer);
      
      return new Promise<void>((resolve) => {
        root.render(
          React.createElement(defaultIcon, {
            size: size,
            color: color,
            strokeWidth: strokeWidth
          })
        );

        let attempts = 0;
        const checkForSVG = () => {
          const svgElement = tempContainer.querySelector('svg');
          
          if (svgElement) {
            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgElement.setAttribute('width', size.toString());
            svgElement.setAttribute('height', size.toString());
            
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const encodedSvg = encodeURIComponent(svgData);
            const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
            
            defaultCursor = `url("${dataUrl}") ${hotspotX} ${hotspotY}, default`;
            element.style.cursor = defaultCursor;
            
            root.unmount();
            document.body.removeChild(tempContainer);
            resolve();
          } else if (attempts < 10) {
            attempts++;
            setTimeout(checkForSVG, 10);
          } else {
            root.unmount();
            document.body.removeChild(tempContainer);
            element.style.cursor = 'default';
            resolve();
          }
        };
        
        setTimeout(checkForSVG, 10);
      });
    };

    // Create cursor for hover state
    const createHoverCursor = () => {
      if (!hoverIcon) return Promise.resolve();

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      const root = createRoot(tempContainer);
      
      return new Promise<void>((resolve) => {
        root.render(
          React.createElement(hoverIcon, {
            size: hoverSize,
            color: hoverColor,
            strokeWidth: hoverStrokeWidth
          })
        );

        let attempts = 0;
        const checkForSVG = () => {
          const svgElement = tempContainer.querySelector('svg');
          
          if (svgElement) {
            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgElement.setAttribute('width', hoverSize.toString());
            svgElement.setAttribute('height', hoverSize.toString());
            
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const encodedSvg = encodeURIComponent(svgData);
            const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
            
            hoverCursor = `url("${dataUrl}") ${hotspotX} ${hotspotY}, pointer`;
            
            root.unmount();
            document.body.removeChild(tempContainer);
            resolve();
          } else if (attempts < 10) {
            attempts++;
            setTimeout(checkForSVG, 10);
          } else {
            root.unmount();
            document.body.removeChild(tempContainer);
            resolve();
          }
        };
        
        setTimeout(checkForSVG, 10);
      });
    };

    // Set up cursors and event listeners
    const setupCursors = async () => {
      await createDefaultCursor();
      await createHoverCursor();

      if (hoverIcon && hoverCursor) {
        const handleMouseEnter = () => {
          element.style.cursor = hoverCursor;
        };

        const handleMouseLeave = () => {
          element.style.cursor = defaultCursor;
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        // Cleanup function
        return () => {
          element.removeEventListener('mouseenter', handleMouseEnter);
          element.removeEventListener('mouseleave', handleMouseLeave);
          element.style.cursor = '';
        };
      }
    };

    setupCursors();

    // Cleanup function
    return () => {
      if (element) {
        element.style.cursor = '';
      }
    };
  }, [defaultIcon, hoverIcon, size, color, strokeWidth, hotspotX, hotspotY, hoverColor, hoverSize, hoverStrokeWidth]);

  return elementRef;
}
// src/utils/iconRenderer.jsx
import React from 'react';

/**
 * Render an SVG icon from the icon object
 * @param {Object} iconObj - The icon object with { svg, viewBox }
 * @param {number} size - The size in pixels
 * @param {string} color - The stroke color (optional)
 * @returns {JSX.Element|null} - The rendered SVG element
 */
export const renderIcon = (iconObj, size = 20, color = null) => {
  if (!iconObj || !iconObj.svg) return null;
  
  let svgString = iconObj.svg;
  // Replace size attributes
  svgString = svgString.replace(/width="\d+"/g, `width="${size}"`);
  svgString = svgString.replace(/height="\d+"/g, `height="${size}"`);
  
  // Replace color if provided
  if (color) {
    svgString = svgString.replace(/stroke="currentColor"/g, `stroke="${color}"`);
  }
  
  // Return as React element with dangerouslySetInnerHTML
  return <span dangerouslySetInnerHTML={{ __html: svgString }} />;
};

export default renderIcon;
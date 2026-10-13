/**
 * Render-Engine für Mandala auf Canvas und SVG Generator.
 * Ausschließlich Arrow-Funktionen.
 */
import { ELEMENT_TYPES } from './layer.js';

const degToRad = (deg) => (deg * Math.PI) / 180;

/**
 * Zeichnet ein einzelnes Basiselement auf einen 2D-Kontext
 */
const renderElementShape = (ctx, layer) => {
  const { type, strokeColor, fillColor, lineWidth } = layer;

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();

  switch (type) {
    case ELEMENT_TYPES.CIRCLE: {
      const { radius, startAngle, endAngle } = layer.circle;
      const sRad = degToRad(startAngle);
      const eRad = degToRad(endAngle);
      ctx.arc(0, 0, Math.max(0.1, radius), sRad, eRad);
      break;
    }

    case ELEMENT_TYPES.RECT: {
      const { width, height, angle } = layer.rect;
      ctx.save();
      if (angle) {
        ctx.rotate(degToRad(angle));
      }
      ctx.rect(-width / 2, -height / 2, width, height);
      ctx.restore();
      break;
    }

    case ELEMENT_TYPES.TRIANGLE: {
      const { width, height, angle } = layer.triangle;
      ctx.save();
      if (angle) {
        ctx.rotate(degToRad(angle));
      }
      const halfW = width / 2;
      const halfH = height / 2;
      ctx.moveTo(0, -halfH);
      ctx.lineTo(halfW, halfH);
      ctx.lineTo(-halfW, halfH);
      ctx.closePath();
      ctx.restore();
      break;
    }

    case ELEMENT_TYPES.TEXT: {
      const { text, fontFamily, fontSize } = layer.text;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (fillColor && fillColor !== 'transparent') {
        ctx.fillText(text || '', 0, 0);
      }
      if (lineWidth > 0 && strokeColor && strokeColor !== 'transparent') {
        ctx.strokeText(text || '', 0, 0);
      }
      return; // Text wird direkt gefüllt/gestroked
    }

    case ELEMENT_TYPES.PATH: {
      const { points, closed } = layer.path;
      if (!points || points.length === 0) return;

      const p0 = points[0];
      ctx.moveTo(p0.x, p0.y);

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        // Verwende prev.cp2 und curr.cp1 für Cubic Bézier
        const cp1x = prev.cp2 ? prev.cp2.x : prev.x;
        const cp1y = prev.cp2 ? prev.cp2.y : prev.y;
        const cp2x = curr.cp1 ? curr.cp1.x : curr.x;
        const cp2y = curr.cp1 ? curr.cp1.y : curr.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
      }

      if (closed && points.length > 1) {
        const last = points[points.length - 1];
        const cp1x = last.cp2 ? last.cp2.x : last.x;
        const cp1y = last.cp2 ? last.cp2.y : last.y;
        const cp2x = p0.cp1 ? p0.cp1.x : p0.x;
        const cp2y = p0.cp1 ? p0.cp1.y : p0.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p0.x, p0.y);
        ctx.closePath();
      }
      break;
    }

    case ELEMENT_TYPES.MANDALA: {
      // Kind-Elemente werden in renderLayerContent gerendert
      break;
    }
  }

  // Für Pfad, Kreis, Rechteck, Dreieck: Fill & Stroke anwenden
  if (type !== ELEMENT_TYPES.TEXT && type !== ELEMENT_TYPES.MANDALA) {
    if (fillColor && fillColor !== 'transparent') {
      ctx.fill();
    }
    if (lineWidth > 0 && strokeColor && strokeColor !== 'transparent') {
      ctx.stroke();
    }
  }
};

/**
 * Zeichnet den Inhalt einer Ebene inklusive eventueller Kinder
 */
const renderLayerContent = (ctx, layer) => {
  renderElementShape(ctx, layer);

  if (layer.children && layer.children.length > 0) {
    layer.children.forEach(child => {
      renderLayer(ctx, child);
    });
  }
};

/**
 * Zeichnet eine Ebene mit all ihren Wiederholungen / Symmetrien und Transformationen
 */
export const renderLayer = (ctx, layer) => {
  if (!layer.visible) return;

  const copies = Math.max(1, layer.copies || 1);
  const totalAngle = layer.totalAngle !== undefined ? layer.totalAngle : 360;
  const angleStep = copies > 1 ? totalAngle / copies : 0;
  
  const pivotX = layer.pivot?.x || 0;
  const pivotY = layer.pivot?.y || 0;

  for (let i = 0; i < copies; i++) {
    ctx.save();

    // 1. Pivot ansteuern
    ctx.translate(pivotX, pivotY);

    // 2. Rotationswinkel für die i-te Kopie
    const currentAngle = degToRad(i * angleStep + (layer.rotation || 0));
    ctx.rotate(currentAngle);

    // 3. Kopie-Skalierung und Kopie-Offset anwenden
    const scaleFactor = Math.pow(layer.copyScale !== undefined ? layer.copyScale : 1, i);
    ctx.scale(scaleFactor, scaleFactor);

    // 4. Offset der Kopie anwenden (z.B. Spiraleffekt)
    const offsetX = (layer.copyOffset?.x || 0) * i;
    const offsetY = (layer.copyOffset?.y || 0) * i;
    ctx.translate(offsetX, offsetY);

    // 5. Position des Elements relativ zum Pivot
    ctx.translate(layer.position.x - pivotX, layer.position.y - pivotY);

    // 6. Opazität berechnen (Basisebene * Kopie-Opazität^i)
    const baseOpacity = layer.opacity !== undefined ? layer.opacity : 1;
    const copyOpacityStep = layer.copyOpacity !== undefined ? layer.copyOpacity : 1;
    const computedOpacity = Math.max(0, Math.min(1, baseOpacity * Math.pow(copyOpacityStep, i)));
    ctx.globalAlpha *= computedOpacity;

    // 7. Inhalt zeichnen
    renderLayerContent(ctx, layer);

    ctx.restore();
  }
};

/**
 * Haupt-Render-Methode für Canvas
 */
export const renderMandalaToCanvas = (ctx, layers, width, height, zoom = 1, pan = { x: 0, y: 0 }) => {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Zentrieren & Zoom/Pan
  ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
  ctx.scale(zoom, zoom);

  layers.forEach(layer => {
    renderLayer(ctx, layer);
  });

  ctx.restore();
};

/**
 * Hilfslinien & Raster zeichnen (Center Guide, Kreise, Winkel)
 */
export const renderGuides = (ctx, width, height, zoom = 1, pan = { x: 0, y: 0 }) => {
  ctx.save();
  ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
  ctx.scale(zoom, zoom);

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);

  // Konzentrische Kreise
  for (let r = 50; r <= 500; r += 50) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Achsen & 12 Segmente
  for (let a = 0; a < 360; a += 30) {
    const rad = degToRad(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(rad) * 600, Math.sin(rad) * 600);
    ctx.stroke();
  }

  // Zentrum markieren
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
  ctx.beginPath();
  ctx.arc(0, 0, 4 / zoom, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
};

// ==========================================
// SVG GENERATOR (Für hochqualitativen Vektor-Export)
// ==========================================

const escapeXml = (unsafe) => {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
};

const getElementSvgMarkup = (layer) => {
  const { type, strokeColor, fillColor, lineWidth } = layer;
  const strokeAttr = lineWidth > 0 && strokeColor && strokeColor !== 'transparent' ? `stroke="${escapeXml(strokeColor)}" stroke-width="${lineWidth}"` : 'stroke="none"';
  const fillAttr = fillColor && fillColor !== 'transparent' ? `fill="${escapeXml(fillColor)}"` : 'fill="none"';

  switch (type) {
    case ELEMENT_TYPES.CIRCLE: {
      const { radius, startAngle, endAngle } = layer.circle;
      const r = Math.max(0.1, radius);
      if (Math.abs(endAngle - startAngle) >= 360) {
        return `<circle cx="0" cy="0" r="${r}" ${fillAttr} ${strokeAttr} />`;
      } else {
        const sRad = degToRad(startAngle);
        const eRad = degToRad(endAngle);
        const x1 = Math.cos(sRad) * r;
        const y1 = Math.sin(sRad) * r;
        const x2 = Math.cos(eRad) * r;
        const y2 = Math.sin(eRad) * r;
        const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
        return `<path d="M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" ${fillAttr} ${strokeAttr} />`;
      }
    }

    case ELEMENT_TYPES.RECT: {
      const { width, height, angle } = layer.rect;
      const transform = angle ? `transform="rotate(${angle})"` : '';
      return `<rect x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" ${transform} ${fillAttr} ${strokeAttr} />`;
    }

    case ELEMENT_TYPES.TRIANGLE: {
      const { width, height, angle } = layer.triangle;
      const transform = angle ? `transform="rotate(${angle})"` : '';
      const halfW = width / 2;
      const halfH = height / 2;
      const d = `M 0 ${-halfH} L ${halfW} ${halfH} L ${-halfW} ${halfH} Z`;
      return `<path d="${d}" ${transform} ${fillAttr} ${strokeAttr} />`;
    }

    case ELEMENT_TYPES.TEXT: {
      const { text, fontFamily, fontSize } = layer.text;
      return `<text x="0" y="0" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central" ${fillAttr} ${strokeAttr}>${escapeXml(text)}</text>`;
    }

    case ELEMENT_TYPES.PATH: {
      const { points, closed } = layer.path;
      if (!points || points.length === 0) return '';
      const p0 = points[0];
      let d = `M ${p0.x} ${p0.y}`;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cp1x = prev.cp2 ? prev.cp2.x : prev.x;
        const cp1y = prev.cp2 ? prev.cp2.y : prev.y;
        const cp2x = curr.cp1 ? curr.cp1.x : curr.x;
        const cp2y = curr.cp1 ? curr.cp1.y : curr.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }

      if (closed && points.length > 1) {
        const last = points[points.length - 1];
        const cp1x = last.cp2 ? last.cp2.x : last.x;
        const cp1y = last.cp2 ? last.cp2.y : last.y;
        const cp2x = p0.cp1 ? p0.cp1.x : p0.x;
        const cp2y = p0.cp1 ? p0.cp1.y : p0.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p0.x} ${p0.y} Z`;
      }

      return `<path d="${d}" ${fillAttr} ${strokeAttr} />`;
    }

    default:
      return '';
  }
};

const layerToSvgGroup = (layer) => {
  if (!layer.visible) return '';

  const copies = Math.max(1, layer.copies || 1);
  const totalAngle = layer.totalAngle !== undefined ? layer.totalAngle : 360;
  const angleStep = copies > 1 ? totalAngle / copies : 0;
  const pivotX = layer.pivot?.x || 0;
  const pivotY = layer.pivot?.y || 0;

  let copiesMarkup = '';

  for (let i = 0; i < copies; i++) {
    const currentAngle = i * angleStep + (layer.rotation || 0);
    const scaleFactor = Math.pow(layer.copyScale !== undefined ? layer.copyScale : 1, i);
    const offsetX = (layer.copyOffset?.x || 0) * i;
    const offsetY = (layer.copyOffset?.y || 0) * i;
    const posX = layer.position.x - pivotX;
    const posY = layer.position.y - pivotY;

    const baseOpacity = layer.opacity !== undefined ? layer.opacity : 1;
    const copyOpacityStep = layer.copyOpacity !== undefined ? layer.copyOpacity : 1;
    const computedOpacity = Math.max(0, Math.min(1, baseOpacity * Math.pow(copyOpacityStep, i)));

    const transform = `translate(${pivotX}, ${pivotY}) rotate(${currentAngle}) scale(${scaleFactor}) translate(${offsetX}, ${offsetY}) translate(${posX}, ${posY})`;

    let innerContent = getElementSvgMarkup(layer);
    if (layer.children && layer.children.length > 0) {
      innerContent += layer.children.map(child => layerToSvgGroup(child)).join('\n');
    }

    copiesMarkup += `<g transform="${transform}" opacity="${computedOpacity}">\n${innerContent}\n</g>\n`;
  }

  return `<g id="${escapeXml(layer.name || layer.id)}">\n${copiesMarkup}</g>`;
};

export const generateMandalaSvg = (layers, size = 1200, transparentBg = true) => {
  const half = size / 2;
  const bgMarkup = transparentBg ? '' : `<rect width="${size}" height="${size}" fill="#ffffff" />`;
  const content = layers.map(layer => layerToSvgGroup(layer)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${bgMarkup}
  <g transform="translate(${half}, ${half})">
    ${content}
  </g>
</svg>`;
};

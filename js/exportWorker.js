/**
 * Web Worker für Mandala Raster- und Vektor-Exportverarbeitung
 * Kann OffscreenCanvas verwenden oder Bilddaten umwandeln.
 * Ausschließlich Arrow-Funktionen.
 */

const degToRad = (deg) => (deg * Math.PI) / 180;

const renderElementShape = (ctx, layer) => {
  const { type, strokeColor, fillColor, lineWidth } = layer;

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();

  switch (type) {
    case 'circle': {
      const { radius, startAngle, endAngle } = layer.circle;
      const sRad = degToRad(startAngle);
      const eRad = degToRad(endAngle);
      ctx.arc(0, 0, Math.max(0.1, radius), sRad, eRad);
      break;
    }
    case 'rect': {
      const { width, height, angle } = layer.rect;
      ctx.save();
      if (angle) ctx.rotate(degToRad(angle));
      ctx.rect(-width / 2, -height / 2, width, height);
      ctx.restore();
      break;
    }
    case 'triangle': {
      const { width, height, angle } = layer.triangle;
      ctx.save();
      if (angle) ctx.rotate(degToRad(angle));
      const halfW = width / 2;
      const halfH = height / 2;
      ctx.moveTo(0, -halfH);
      ctx.lineTo(halfW, halfH);
      ctx.lineTo(-halfW, halfH);
      ctx.closePath();
      ctx.restore();
      break;
    }
    case 'text': {
      const { text, fontFamily, fontSize } = layer.text;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (fillColor && fillColor !== 'transparent') ctx.fillText(text || '', 0, 0);
      if (lineWidth > 0 && strokeColor && strokeColor !== 'transparent') ctx.strokeText(text || '', 0, 0);
      return;
    }
    case 'path': {
      const { points, closed } = layer.path;
      if (!points || points.length === 0) return;
      const p0 = points[0];
      ctx.moveTo(p0.x, p0.y);

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
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
  }

  if (type !== 'text' && type !== 'mandala') {
    if (fillColor && fillColor !== 'transparent') ctx.fill();
    if (lineWidth > 0 && strokeColor && strokeColor !== 'transparent') ctx.stroke();
  }
};

const renderLayer = (ctx, layer) => {
  if (!layer.visible) return;

  const copies = Math.max(1, layer.copies || 1);
  const totalAngle = layer.totalAngle !== undefined ? layer.totalAngle : 360;
  const angleStep = copies > 1 ? totalAngle / copies : 0;
  const pivotX = layer.pivot?.x || 0;
  const pivotY = layer.pivot?.y || 0;

  for (let i = 0; i < copies; i++) {
    ctx.save();
    ctx.translate(pivotX, pivotY);

    const currentAngle = degToRad(i * angleStep + (layer.rotation || 0));
    ctx.rotate(currentAngle);

    const scaleFactor = Math.pow(layer.copyScale !== undefined ? layer.copyScale : 1, i);
    ctx.scale(scaleFactor, scaleFactor);

    const offsetX = (layer.copyOffset?.x || 0) * i;
    const offsetY = (layer.copyOffset?.y || 0) * i;
    ctx.translate(offsetX, offsetY);

    ctx.translate(layer.position.x - pivotX, layer.position.y - pivotY);

    const baseOpacity = layer.opacity !== undefined ? layer.opacity : 1;
    const copyOpacityStep = layer.copyOpacity !== undefined ? layer.copyOpacity : 1;
    const computedOpacity = Math.max(0, Math.min(1, baseOpacity * Math.pow(copyOpacityStep, i)));
    ctx.globalAlpha *= computedOpacity;

    renderElementShape(ctx, layer);

    if (layer.children && layer.children.length > 0) {
      layer.children.forEach(child => renderLayer(ctx, child));
    }

    ctx.restore();
  }
};

self.onmessage = (e) => {
  const { layers, size, format, transparentBg } = e.data;

  // OffscreenCanvas Rendering im Worker
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(size, size);
      const ctx = offscreen.getContext('2d');

      if (!transparentBg || format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
      }

      ctx.save();
      ctx.translate(size / 2, size / 2);

      // Skalierung proportional zum Standard-Canvas (800px Basis)
      const scale = size / 800;
      ctx.scale(scale, scale);

      layers.forEach(layer => renderLayer(ctx, layer));
      ctx.restore();

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      offscreen.convertToBlob({ type: mimeType, quality: 0.95 }).then(blob => {
        self.postMessage({ success: true, blob, format });
      }).catch(err => {
        self.postMessage({ success: false, error: err.message });
      });
    } else {
      self.postMessage({ success: false, error: 'OffscreenCanvas not supported' });
    }
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};

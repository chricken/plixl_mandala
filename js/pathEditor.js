/**
 * Pfad-Editor für interaktive Bézier-Kurven im Canvas.
 * Handhabt Stützpunkte (Anchor Points) und Anfasser (Control Points cp1, cp2).
 * Unterstützt Drag & Drop, Hover-Effekt (Schatten/Glow) und Punkte hinzufügen/entfernen.
 * Ausschließlich Arrow-Funktionen.
 */
import { ELEMENT_TYPES } from './layer.js';

const degToRad = (deg) => (deg * Math.PI) / 180;
const radToDeg = (rad) => (rad * 180) / Math.PI;

export const createPathEditor = (canvas, appState, onUpdate) => {
  let hoveredHandle = null; // { layerId, pointIndex, type: 'anchor'|'cp1'|'cp2' }
  let draggingHandle = null;
  let dragStartPos = { x: 0, y: 0 };
  let originalPointState = null;

  /**
   * Berechnet den 2D-Transformationszustand für das Basiselement (Kopie 0)
   */
  const getLayerBaseTransform = (layer) => {
    // Ebene 0 Kopie: Pivot -> Rotation -> Offset(0) -> Pos - Pivot
    const pivotX = layer.pivot?.x || 0;
    const pivotY = layer.pivot?.y || 0;
    const rotRad = degToRad(layer.rotation || 0);
    const posX = layer.position.x;
    const posY = layer.position.y;

    return { pivotX, pivotY, rotRad, posX, posY };
  };

  /**
   * Rechnet Canvas-Mauskoordinaten (im Mandala-Zentrumskoordinatensystem) in Layer-Lokalkoordinaten um
   */
  const mandalaToLayerLocal = (layer, mX, mY) => {
    const { pivotX, pivotY, rotRad, posX, posY } = getLayerBaseTransform(layer);

    // 1. Relativ zu Pivot
    let x = mX - pivotX;
    let y = mY - pivotY;

    // 2. Gegen-rotieren
    const cos = Math.cos(-rotRad);
    const sin = Math.sin(-rotRad);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    // 3. Relativ zu Layer-Position
    return {
      x: rx - (posX - pivotX),
      y: ry - (posY - pivotY)
    };
  };

  /**
   * Rechnet Layer-Lokalkoordinaten in Mandala-Zentrumskoordinaten um
   */
  const layerLocalToMandala = (layer, lx, ly) => {
    const { pivotX, pivotY, rotRad, posX, posY } = getLayerBaseTransform(layer);

    const translatedX = lx + (posX - pivotX);
    const translatedY = ly + (posY - pivotY);

    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);
    const rx = translatedX * cos - translatedY * sin;
    const ry = translatedX * sin + translatedY * cos;

    return {
      x: rx + pivotX,
      y: ry + pivotY
    };
  };

  /**
   * Rechnet Viewport Screen-Pixel in Mandala-Zentrumskoordinaten um (inklusive Zoom & Pan)
   */
  const screenToMandalaCoords = (screenX, screenY) => {
    const rect = canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    const zoom = appState.zoom || 1;
    const pan = appState.pan || { x: 0, y: 0 };

    return {
      x: (x - (width / 2 + pan.x)) / zoom,
      y: (y - (height / 2 + pan.y)) / zoom
    };
  };

  /**
   * Findet den Anfasser oder Stützpunkt unter dem Mauszeiger
   */
  const findHandleAt = (mandalaPos, threshold = 10) => {
    const selectedLayer = appState.selectedLayer;
    if (!selectedLayer || selectedLayer.type !== ELEMENT_TYPES.PATH) {
      return null;
    }

    const { points } = selectedLayer.path;
    if (!points || points.length === 0) return null;

    const zoom = appState.zoom || 1;
    const hitDistance = threshold / zoom;

    // Kontrollpunkte / Anfasser zuerst prüfen (höhere Priorität als Stützpunkt)
    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      if (p.cp1) {
        const cp1World = layerLocalToMandala(selectedLayer, p.cp1.x, p.cp1.y);
        const dist = Math.hypot(cp1World.x - mandalaPos.x, cp1World.y - mandalaPos.y);
        if (dist <= hitDistance) {
          return { layer: selectedLayer, pointIndex: i, type: 'cp1', point: p };
        }
      }

      if (p.cp2) {
        const cp2World = layerLocalToMandala(selectedLayer, p.cp2.x, p.cp2.y);
        const dist = Math.hypot(cp2World.x - mandalaPos.x, cp2World.y - mandalaPos.y);
        if (dist <= hitDistance) {
          return { layer: selectedLayer, pointIndex: i, type: 'cp2', point: p };
        }
      }
    }

    // Danach Stützpunkte prüfen
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const anchorWorld = layerLocalToMandala(selectedLayer, p.x, p.y);
      const dist = Math.hypot(anchorWorld.x - mandalaPos.x, anchorWorld.y - mandalaPos.y);
      if (dist <= hitDistance) {
        return { layer: selectedLayer, pointIndex: i, type: 'anchor', point: p };
      }
    }

    return null;
  };

  /**
   * Rendert die interaktiven Kontrollpunkte und Anfasser auf das Canvas
   */
  const renderOverlay = (ctx, zoom, pan) => {
    const selectedLayer = appState.selectedLayer;
    if (!selectedLayer || selectedLayer.type !== ELEMENT_TYPES.PATH || !selectedLayer.visible) {
      return;
    }

    const { points } = selectedLayer.path;
    if (!points || points.length === 0) return;

    ctx.save();
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // Transformiere alle Punkte in Weltkoordinaten
    const worldPoints = points.map(p => ({
      anchor: layerLocalToMandala(selectedLayer, p.x, p.y),
      cp1: p.cp1 ? layerLocalToMandala(selectedLayer, p.cp1.x, p.cp1.y) : null,
      cp2: p.cp2 ? layerLocalToMandala(selectedLayer, p.cp2.x, p.cp2.y) : null
    }));

    // Verbindungslinien zwischen Stützpunkten und Anfassern zeichnen
    ctx.lineWidth = 1.2 / zoom;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';

    worldPoints.forEach(wp => {
      if (wp.cp1) {
        ctx.beginPath();
        ctx.moveTo(wp.anchor.x, wp.anchor.y);
        ctx.lineTo(wp.cp1.x, wp.cp1.y);
        ctx.stroke();
      }
      if (wp.cp2) {
        ctx.beginPath();
        ctx.moveTo(wp.anchor.x, wp.anchor.y);
        ctx.lineTo(wp.cp2.x, wp.cp2.y);
        ctx.stroke();
      }
    });

    // Anfasser (Control Points) zeichnen
    const handleRadius = 4.5 / zoom;
    const anchorRadius = 5.5 / zoom;

    worldPoints.forEach((wp, idx) => {
      // CP1
      if (wp.cp1) {
        const isHovered = hoveredHandle && hoveredHandle.pointIndex === idx && hoveredHandle.type === 'cp1';
        ctx.save();
        if (isHovered) {
          ctx.shadowColor = '#6366f1';
          ctx.shadowBlur = 12 / zoom;
        }
        ctx.beginPath();
        ctx.arc(wp.cp1.x, wp.cp1.y, handleRadius * (isHovered ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#818cf8' : '#e0e7ff';
        ctx.strokeStyle = '#4338ca';
        ctx.lineWidth = 1.5 / zoom;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // CP2
      if (wp.cp2) {
        const isHovered = hoveredHandle && hoveredHandle.pointIndex === idx && hoveredHandle.type === 'cp2';
        ctx.save();
        if (isHovered) {
          ctx.shadowColor = '#6366f1';
          ctx.shadowBlur = 12 / zoom;
        }
        ctx.beginPath();
        ctx.arc(wp.cp2.x, wp.cp2.y, handleRadius * (isHovered ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#818cf8' : '#e0e7ff';
        ctx.strokeStyle = '#4338ca';
        ctx.lineWidth = 1.5 / zoom;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Stützpunkt (Anchor)
      const isAnchorHovered = hoveredHandle && hoveredHandle.pointIndex === idx && hoveredHandle.type === 'anchor';
      ctx.save();
      if (isAnchorHovered) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14 / zoom;
      }
      ctx.beginPath();
      ctx.rect(
        wp.anchor.x - (anchorRadius * (isAnchorHovered ? 1.3 : 1)),
        wp.anchor.y - (anchorRadius * (isAnchorHovered ? 1.3 : 1)),
        anchorRadius * 2 * (isAnchorHovered ? 1.3 : 1),
        anchorRadius * 2 * (isAnchorHovered ? 1.3 : 1)
      );
      ctx.fillStyle = isAnchorHovered ? '#fbbf24' : '#f59e0b';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5 / zoom;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  };

  /**
   * Event-Handler für Mausaktionen
   */
  const handlePointerDown = (e) => {
    if (e.button !== 0) return false; // Nur Linksklick

    const mPos = screenToMandalaCoords(e.clientX, e.clientY);
    const hit = findHandleAt(mPos);

    if (hit) {
      draggingHandle = hit;
      dragStartPos = mPos;
      originalPointState = JSON.parse(JSON.stringify(hit.point));
      return true; // Abfangen für Path-Drag
    }
    return false;
  };

  const handlePointerMove = (e) => {
    const mPos = screenToMandalaCoords(e.clientX, e.clientY);

    if (draggingHandle) {
      const selectedLayer = draggingHandle.layer;
      const point = selectedLayer.path.points[draggingHandle.pointIndex];
      const localCurrent = mandalaToLayerLocal(selectedLayer, mPos.x, mPos.y);

      if (draggingHandle.type === 'anchor') {
        const dx = localCurrent.x - originalPointState.x;
        const dy = localCurrent.y - originalPointState.y;

        point.x = localCurrent.x;
        point.y = localCurrent.y;

        if (point.cp1 && originalPointState.cp1) {
          point.cp1.x = originalPointState.cp1.x + dx;
          point.cp1.y = originalPointState.cp1.y + dy;
        }
        if (point.cp2 && originalPointState.cp2) {
          point.cp2.x = originalPointState.cp2.x + dx;
          point.cp2.y = originalPointState.cp2.y + dy;
        }
      } else if (draggingHandle.type === 'cp1') {
        point.cp1 = { x: localCurrent.x, y: localCurrent.y };
        // Optional: Symmetrische Bewegung für glatte Kurve bei Shift-Taste
        if (e.shiftKey && point.cp2) {
          const dx = point.x - localCurrent.x;
          const dy = point.y - localCurrent.y;
          point.cp2 = { x: point.x + dx, y: point.y + dy };
        }
      } else if (draggingHandle.type === 'cp2') {
        point.cp2 = { x: localCurrent.x, y: localCurrent.y };
        if (e.shiftKey && point.cp1) {
          const dx = point.x - localCurrent.x;
          const dy = point.y - localCurrent.y;
          point.cp1 = { x: point.x + dx, y: point.y + dy };
        }
      }

      onUpdate();
      return true;
    }

    // Hover-Zustand aktualisieren
    const hit = findHandleAt(mPos);
    if ((hit && !hoveredHandle) || (!hit && hoveredHandle) || (hit && hoveredHandle && (hit.type !== hoveredHandle.type || hit.pointIndex !== hoveredHandle.pointIndex))) {
      hoveredHandle = hit;
      onUpdate();
    }

    return !!hit;
  };

  const handlePointerUp = () => {
    if (draggingHandle) {
      draggingHandle = null;
      originalPointState = null;
      onUpdate();
      return true;
    }
    return false;
  };

  /**
   * Fügt einen neuen Punkt zum aktuellen Pfad hinzu
   */
  const addPointToActivePath = (x = 0, y = 50) => {
    const selectedLayer = appState.selectedLayer;
    if (!selectedLayer || selectedLayer.type !== ELEMENT_TYPES.PATH) return;

    const points = selectedLayer.path.points;
    const newPoint = {
      x,
      y,
      cp1: { x: x - 25, y: y },
      cp2: { x: x + 25, y: y }
    };
    points.push(newPoint);
    onUpdate();
  };

  /**
   * Entfernt den zuletzt ausgewählten oder letzten Punkt
   */
  const removePointFromActivePath = (index = -1) => {
    const selectedLayer = appState.selectedLayer;
    if (!selectedLayer || selectedLayer.type !== ELEMENT_TYPES.PATH) return;

    const points = selectedLayer.path.points;
    if (points.length <= 2) return; // Mindestens 2 Punkte behalten

    if (index >= 0 && index < points.length) {
      points.splice(index, 1);
    } else {
      points.pop();
    }
    onUpdate();
  };

  return {
    renderOverlay,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    addPointToActivePath,
    removePointFromActivePath,
    isInteracting: () => !!draggingHandle
  };
};

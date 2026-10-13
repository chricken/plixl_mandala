/**
 * Hauptanwendung (App-Einstiegspunkt).
 * Initialisiert Canvas, Event-Handling, Pan/Zoom, Layers, Inspector, PathEditor und ExportManager.
 * Ausschließlich Arrow-Funktionen.
 */
import { ELEMENT_TYPES, createLayer } from './layer.js';
import { renderMandalaToCanvas, renderGuides } from './renderer.js';
import { createPathEditor } from './pathEditor.js';
import { createLayersPanel } from './layersPanel.js';
import { createPropertiesInspector } from './propertiesInspector.js';
import { createExportManager } from './exportManager.js';

// Zentraler Anwendungs-Status
const appState = {
  layers: [],
  selectedLayer: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  showGuides: true,
  isPanning: false,
  panStart: { x: 0, y: 0 }
};

/**
 * Erstellt ein schönes vordefiniertes Mandala als Startbeispiel
 */
const createInitialMandala = () => {
  // 1. Äußerer Blütenpfad
  const outerPetals = createLayer({
    name: 'Blütenblätter Außen',
    type: ELEMENT_TYPES.PATH,
    strokeColor: '#818cf8',
    fillColor: 'rgba(99, 102, 241, 0.15)',
    lineWidth: 2,
    copies: 12,
    totalAngle: 360,
    position: { x: 0, y: -160 },
    rotation: 0,
    path: {
      closed: true,
      points: [
        { x: 0, y: -70, cp1: { x: -35, y: -40 }, cp2: { x: 35, y: -40 } },
        { x: 45, y: 10, cp1: { x: 30, y: -20 }, cp2: { x: 25, y: 40 } },
        { x: 0, y: 70, cp1: { x: 20, y: 55 }, cp2: { x: -20, y: 55 } },
        { x: -45, y: 10, cp1: { x: -25, y: 40 }, cp2: { x: -30, y: -20 } }
      ]
    }
  });

  // 2. Geometrische Dreiecke
  const triangles = createLayer({
    name: 'Dreiecke Ring',
    type: ELEMENT_TYPES.TRIANGLE,
    strokeColor: '#38bdf8',
    fillColor: 'transparent',
    lineWidth: 1.5,
    copies: 12,
    totalAngle: 360,
    position: { x: 0, y: -110 },
    rotation: 15,
    triangle: {
      width: 50,
      height: 60,
      angle: 0
    }
  });

  // 3. Konzentrische Kreise / Mandala-Gruppe
  const subMandala = createLayer({
    name: 'Zentrales Mandala',
    type: ELEMENT_TYPES.MANDALA,
    copies: 8,
    totalAngle: 360,
    rotation: 0,
    children: [
      createLayer({
        name: 'Muster Kreise',
        type: ELEMENT_TYPES.CIRCLE,
        strokeColor: '#f472b6',
        fillColor: 'rgba(244, 114, 182, 0.12)',
        lineWidth: 1.5,
        position: { x: 0, y: -50 },
        copies: 1,
        circle: { radius: 35, startAngle: 0, endAngle: 360 }
      })
    ]
  });

  // 4. Zentrales Symbol (Text)
  const centerSymbol = createLayer({
    name: 'Zentrum Symbol',
    type: ELEMENT_TYPES.TEXT,
    strokeColor: '#fbbf24',
    fillColor: '#fbbf24',
    lineWidth: 1,
    copies: 1,
    position: { x: 0, y: 0 },
    text: {
      text: '✦',
      fontFamily: 'serif',
      fontSize: 48
    }
  });

  // 5. Äußerer Zierkreis
  const borderCircle = createLayer({
    name: 'Außenring',
    type: ELEMENT_TYPES.CIRCLE,
    strokeColor: 'rgba(255, 255, 255, 0.4)',
    fillColor: 'transparent',
    lineWidth: 1,
    copies: 1,
    circle: { radius: 260, startAngle: 0, endAngle: 360 }
  });

  appState.layers = [borderCircle, outerPetals, triangles, subMandala, centerSymbol];
  appState.selectedLayer = outerPetals;
};

// Initialisierung bei DOM-Bereitschaft
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('mandala-canvas');
  const viewport = document.getElementById('canvas-viewport');
  const ctx = canvas.getContext('2d');
  const zoomIndicator = document.getElementById('zoom-indicator');
  const propertiesContainer = document.getElementById('properties-container');
  const layersTree = document.getElementById('layers-tree');

  let pathEditor = null;
  let layersPanel = null;
  let propertiesInspector = null;
  let exportManager = null;

  /**
   * Passt die Canvas-Größe bei Fensteränderung an
   */
  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = viewport.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    redraw();
  };

  /**
   * Zeichnet das gesamte Canvas inklusive Hilfslinien und Pfad-Overlay neu
   */
  const redraw = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Hilfslinien (falls aktiviert)
    if (appState.showGuides) {
      renderGuides(ctx, w, h, appState.zoom, appState.pan);
    }

    // 2. Mandala Ebenen rendern
    renderMandalaToCanvas(ctx, appState.layers, w, h, appState.zoom, appState.pan);

    // 3. Pfad-Editor Overlay (Punkte & Anfasser)
    if (pathEditor) {
      pathEditor.renderOverlay(ctx, appState.zoom, appState.pan);
    }

    ctx.restore();

    // Zoom-Anzeige aktualisieren
    if (zoomIndicator) {
      zoomIndicator.textContent = `${Math.round(appState.zoom * 100)}%`;
    }
  };

  /**
   * Callback bei Zustandsänderungen
   */
  const handleStateChange = (fullUiUpdate = true) => {
    redraw();
    if (fullUiUpdate) {
      if (layersPanel) layersPanel.render();
      if (propertiesInspector) propertiesInspector.render();
    }
  };

  // Startdaten erzeugen
  createInitialMandala();

  // Module initialisieren
  pathEditor = createPathEditor(canvas, appState, () => redraw());
  layersPanel = createLayersPanel(document.getElementById('layers-window'), layersTree, appState, handleStateChange);
  propertiesInspector = createPropertiesInspector(propertiesContainer, appState, handleStateChange, pathEditor);
  exportManager = createExportManager(appState);
  exportManager.initDialog();

  // Canvas Viewport Interaktionen (Pan & Zoom & Path Editing)
  canvas.addEventListener('mousedown', (e) => {
    // Wenn Pfad-Editor einen Punkt getroffen hat
    if (pathEditor.handlePointerDown(e)) {
      return;
    }

    // Rechtsklick oder Leertaste/Mittelklick für Pan
    if (e.button === 1 || e.button === 2 || e.altKey || e.shiftKey) {
      appState.isPanning = true;
      appState.panStart = { x: e.clientX - appState.pan.x, y: e.clientY - appState.pan.y };
      canvas.style.cursor = 'grab';
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (pathEditor.handlePointerMove(e)) {
      return;
    }

    if (appState.isPanning) {
      appState.pan.x = e.clientX - appState.panStart.x;
      appState.pan.y = e.clientY - appState.panStart.y;
      canvas.style.cursor = 'grabbing';
      redraw();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (pathEditor.handlePointerUp(e)) {
      // Path Edit abgeschlossen
    }
    if (appState.isPanning) {
      appState.isPanning = false;
      canvas.style.cursor = 'crosshair';
    }
  });

  // Zoom mit Mausrad
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.2, Math.min(6, appState.zoom * zoomFactor));

    // Zoom zentriert auf Cursor
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    appState.pan.x = mouseX - (mouseX - appState.pan.x) * (newZoom / appState.zoom);
    appState.pan.y = mouseY - (mouseY - appState.pan.y) * (newZoom / appState.zoom);
    appState.zoom = newZoom;

    redraw();
  }, { passive: false });

  // Kontextmenü verhindern (für sauberen Rechtsklick-Pan)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Header Buttons
  document.getElementById('btn-add-layer')?.addEventListener('click', () => {
    layersPanel.addLayerWithType(ELEMENT_TYPES.CIRCLE);
  });

  document.getElementById('btn-add-group')?.addEventListener('click', () => {
    layersPanel.addLayerWithType(ELEMENT_TYPES.MANDALA);
  });

  document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
    appState.zoom = 1;
    appState.pan = { x: 0, y: 0 };
    redraw();
  });

  document.getElementById('btn-toggle-grid')?.addEventListener('click', () => {
    appState.showGuides = !appState.showGuides;
    redraw();
  });

  // Tastenkombinationen (Entf zum Löschen ausgewählter Ebene, etc.)
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (appState.selectedLayer) {
        const id = appState.selectedLayer.id;
        const removeRecursive = (list) => {
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === id) {
              list.splice(i, 1);
              return true;
            }
            if (list[i].children && removeRecursive(list[i].children)) return true;
          }
          return false;
        };
        removeRecursive(appState.layers);
        appState.selectedLayer = null;
        handleStateChange();
      }
    } else if (e.key === '+' || e.key === '=') {
      appState.zoom = Math.min(6, appState.zoom * 1.15);
      redraw();
    } else if (e.key === '-' || e.key === '_') {
      appState.zoom = Math.max(0.2, appState.zoom / 1.15);
      redraw();
    } else if (e.key === '0') {
      appState.zoom = 1;
      appState.pan = { x: 0, y: 0 };
      redraw();
    }
  });

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  handleStateChange(true);
});

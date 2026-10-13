/**
 * Modellierung und Factory für Mandala-Ebenen
 * Alle Funktionen sind reine Arrow-Funktionen.
 */

export const ELEMENT_TYPES = {
  CIRCLE: 'circle',
  RECT: 'rect',
  TRIANGLE: 'triangle',
  TEXT: 'text',
  PATH: 'path',
  MANDALA: 'mandala'
};

export const createDefaultPathPoints = () => [
  {
    x: 0,
    y: -80,
    cp1: { x: -30, y: -60 },
    cp2: { x: 30, y: -60 }
  },
  {
    x: 40,
    y: 0,
    cp1: { x: 40, y: -40 },
    cp2: { x: 40, y: 40 }
  },
  {
    x: 0,
    y: 80,
    cp1: { x: 30, y: 60 },
    cp2: { x: -30, y: 60 }
  },
  {
    x: -40,
    y: 0,
    cp1: { x: -40, y: 40 },
    cp2: { x: -40, y: -40 }
  }
];

let idCounter = 1;
export const generateId = () => `layer_${Date.now()}_${idCounter++}`;

export const createLayer = (options = {}) => {
  const type = options.type || ELEMENT_TYPES.CIRCLE;
  
  const baseLayer = {
    id: options.id || generateId(),
    name: options.name || getDefaultName(type),
    type: type,
    visible: options.visible !== undefined ? options.visible : true,
    
    // Basis-Styling
    strokeColor: options.strokeColor || '#ffffff',
    fillColor: options.fillColor !== undefined ? options.fillColor : 'transparent',
    lineWidth: options.lineWidth !== undefined ? options.lineWidth : 2,
    opacity: options.opacity !== undefined ? options.opacity : 1,
    
    // Basis-Transformation
    position: {
      x: options.position?.x || 0,
      y: options.position?.y || 0
    },
    rotation: options.rotation !== undefined ? options.rotation : 0, // in Grad
    
    // Wiederholung / Symmetrie
    copies: options.copies !== undefined ? options.copies : 6,
    totalAngle: options.totalAngle !== undefined ? options.totalAngle : 360, // in Grad
    copyOffset: {
      x: options.copyOffset?.x || 0,
      y: options.copyOffset?.y || 0
    },
    copyScale: options.copyScale !== undefined ? options.copyScale : 1,
    copyOpacity: options.copyOpacity !== undefined ? options.copyOpacity : 1,
    pivot: {
      x: options.pivot?.x || 0,
      y: options.pivot?.y || 0
    },

    // Typ-spezifische Daten
    circle: {
      radius: options.circle?.radius !== undefined ? options.circle.radius : 60,
      startAngle: options.circle?.startAngle !== undefined ? options.circle.startAngle : 0,
      endAngle: options.circle?.endAngle !== undefined ? options.circle.endAngle : 360
    },
    rect: {
      width: options.rect?.width !== undefined ? options.rect.width : 80,
      height: options.rect?.height !== undefined ? options.rect.height : 50,
      angle: options.rect?.angle !== undefined ? options.rect.angle : 0
    },
    triangle: {
      width: options.triangle?.width !== undefined ? options.triangle.width : 80,
      height: options.triangle?.height !== undefined ? options.triangle.height : 80,
      angle: options.triangle?.angle !== undefined ? options.triangle.angle : 0
    },
    text: {
      text: options.text?.text !== undefined ? options.text.text : 'ॐ',
      fontFamily: options.text?.fontFamily || 'Arial, sans-serif',
      fontSize: options.text?.fontSize !== undefined ? options.text.fontSize : 40
    },
    path: {
      closed: options.path?.closed !== undefined ? options.path.closed : true,
      points: options.path?.points ? JSON.parse(JSON.stringify(options.path.points)) : createDefaultPathPoints()
    },
    
    // Verschachtelte Ebenen (für Sub-Mandalas und Gruppen)
    children: options.children ? options.children.map(child => createLayer(child)) : []
  };

  return baseLayer;
};

export const getDefaultName = (type) => {
  switch (type) {
    case ELEMENT_TYPES.CIRCLE: return 'Kreis';
    case ELEMENT_TYPES.RECT: return 'Rechteck';
    case ELEMENT_TYPES.TRIANGLE: return 'Dreieck';
    case ELEMENT_TYPES.TEXT: return 'Text';
    case ELEMENT_TYPES.PATH: return 'Pfad';
    case ELEMENT_TYPES.MANDALA: return 'Verschachteltes Mandala';
    default: return 'Ebene';
  }
};

/**
 * Klont eine Ebene rekursiv
 */
export const cloneLayer = (layer) => {
  return createLayer(JSON.parse(JSON.stringify(layer)));
};

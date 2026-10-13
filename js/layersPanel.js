/**
 * Ebenen-Verwaltung und UI (Tree-View, Drag & Drop, Verschachtelung, Floating/Dockable Panel)
 * Ausschließlich Arrow-Funktionen.
 */
import { ELEMENT_TYPES, createLayer, getDefaultName } from './layer.js';

export const createLayersPanel = (container, layersTreeEl, appState, onStateChange) => {
  let draggedLayerId = null;
  let dragTargetId = null;
  let dragPosition = null; // 'before' | 'after' | 'inside'

  const panelWindow = document.getElementById('layers-window');
  const panelHeader = document.getElementById('layers-window-header');
  const btnDock = document.getElementById('btn-dock-layers');
  const btnMinimize = document.getElementById('btn-minimize-layers');

  // Floating & Docking State
  let isDocked = false;
  let isMinimized = false;
  let isDraggingWindow = false;
  let windowDragOffset = { x: 0, y: 0 };

  /**
   * Initialisiert Drag & Drop sowie Dock/Min-Buttons für das Ebenen-Fenster
   */
  const initWindowControls = () => {
    panelHeader.addEventListener('mousedown', (e) => {
      if (isDocked || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      isDraggingWindow = true;
      const rect = panelWindow.getBoundingClientRect();
      windowDragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDraggingWindow || isDocked) return;
      const x = Math.max(0, Math.min(window.innerWidth - panelWindow.offsetWidth, e.clientX - windowDragOffset.x));
      const y = Math.max(48, Math.min(window.innerHeight - 40, e.clientY - windowDragOffset.y));
      panelWindow.style.left = `${x}px`;
      panelWindow.style.top = `${y}px`;
    });

    window.addEventListener('mouseup', () => {
      isDraggingWindow = false;
    });

    btnDock.addEventListener('click', () => {
      isDocked = !isDocked;
      if (isDocked) {
        panelWindow.classList.remove('floating');
        panelWindow.classList.add('docked');
        // Im Arbeitsbereich links andocken
        const workspace = document.querySelector('.workspace-container');
        workspace.insertBefore(panelWindow, workspace.firstChild);
        btnDock.title = "Loslösen (Floating)";
        btnDock.textContent = "⧉";
      } else {
        panelWindow.classList.remove('docked');
        panelWindow.classList.add('floating');
        document.querySelector('.workspace-container').appendChild(panelWindow);
        panelWindow.style.top = '60px';
        panelWindow.style.left = '20px';
        btnDock.title = "Andocken";
        btnDock.textContent = "🗖";
      }
    });

    btnMinimize.addEventListener('click', () => {
      isMinimized = !isMinimized;
      panelWindow.classList.toggle('minimized', isMinimized);
      btnMinimize.textContent = isMinimized ? "□" : "_";
    });
  };

  /**
   * Sucht eine Ebene anhand ihrer ID rekursiv im Baum
   */
  const findLayerAndParent = (layers, id, parent = null) => {
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].id === id) {
        return { layer: layers[i], parent, index: i, list: layers };
      }
      if (layers[i].children && layers[i].children.length > 0) {
        const found = findLayerAndParent(layers[i].children, id, layers[i]);
        if (found) return found;
      }
    }
    return null;
  };

  /**
   * Rekursives Löschen einer Ebene
   */
  const removeLayer = (id) => {
    const found = findLayerAndParent(appState.layers, id);
    if (!found) return;

    found.list.splice(found.index, 1);
    if (appState.selectedLayer?.id === id) {
      appState.selectedLayer = null;
    }
    onStateChange();
  };

  /**
   * Rekursive Bewegung / Verschachtelung im Baum
   */
  const moveLayer = (sourceId, targetId, position) => {
    if (sourceId === targetId) return;

    const sourceInfo = findLayerAndParent(appState.layers, sourceId);
    const targetInfo = findLayerAndParent(appState.layers, targetId);

    if (!sourceInfo || !targetInfo) return;

    // Verhindere das Verschieben eines Eltern-Knotens in seine eigenen Nachkommen
    const isDescendant = (parent, childId) => {
      if (!parent.children) return false;
      for (const c of parent.children) {
        if (c.id === childId || isDescendant(c, childId)) return true;
      }
      return false;
    };
    if (isDescendant(sourceInfo.layer, targetId)) return;

    // 1. Aus der alten Position entfernen
    const [removed] = sourceInfo.list.splice(sourceInfo.index, 1);

    // 2. An der neuen Position einfügen
    if (position === 'inside') {
      if (!targetInfo.layer.children) {
        targetInfo.layer.children = [];
      }
      // Automatisches Konvertieren zu Mandala/Gruppe falls es noch keines war
      if (targetInfo.layer.type !== ELEMENT_TYPES.MANDALA) {
        targetInfo.layer.type = ELEMENT_TYPES.MANDALA;
      }
      targetInfo.layer.children.push(removed);
    } else if (position === 'before') {
      const newTargetInfo = findLayerAndParent(appState.layers, targetId);
      newTargetInfo.list.splice(newTargetInfo.index, 0, removed);
    } else { // 'after'
      const newTargetInfo = findLayerAndParent(appState.layers, targetId);
      newTargetInfo.list.splice(newTargetInfo.index + 1, 0, removed);
    }

    onStateChange();
  };

  /**
   * Baut die Ebenen-Baum-DOM-Elemente auf
   */
  const renderTree = () => {
    layersTreeEl.innerHTML = '';

    const createLayerItemEl = (layer, depth = 0) => {
      const itemWrapper = document.createElement('div');
      itemWrapper.className = 'layer-item-wrapper';

      const itemEl = document.createElement('div');
      itemEl.className = `layer-item ${appState.selectedLayer?.id === layer.id ? 'active' : ''}`;
      itemEl.draggable = true;
      itemEl.dataset.id = layer.id;

      // Icon je nach Typ
      const iconMap = {
        [ELEMENT_TYPES.CIRCLE]: '○',
        [ELEMENT_TYPES.RECT]: '▭',
        [ELEMENT_TYPES.TRIANGLE]: '△',
        [ELEMENT_TYPES.TEXT]: 'T',
        [ELEMENT_TYPES.PATH]: '∿',
        [ELEMENT_TYPES.MANDALA]: '❖'
      };

      const iconSpan = document.createElement('span');
      iconSpan.className = 'layer-icon';
      iconSpan.textContent = iconMap[layer.type] || '•';

      // Name Input (Inline-Editing)
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'layer-name-input';
      nameInput.value = layer.name || getDefaultName(layer.type);
      nameInput.title = "Klicken zum Umbenennen";
      nameInput.addEventListener('click', (e) => e.stopPropagation());
      nameInput.addEventListener('change', (e) => {
        layer.name = e.target.value.trim() || getDefaultName(layer.type);
        onStateChange();
      });

      // Actions: Visibility Checkbox & Delete
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'layer-actions';

      const visCheckbox = document.createElement('input');
      visCheckbox.type = 'checkbox';
      visCheckbox.checked = layer.visible;
      visCheckbox.title = "Sichtbarkeit umschalten";
      visCheckbox.addEventListener('click', (e) => e.stopPropagation());
      visCheckbox.addEventListener('change', (e) => {
        layer.visible = e.target.checked;
        onStateChange();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'layer-btn-delete';
      delBtn.innerHTML = '🗑';
      delBtn.title = "Ebene löschen";
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeLayer(layer.id);
      });

      actionsDiv.appendChild(visCheckbox);
      actionsDiv.appendChild(delBtn);

      itemEl.appendChild(iconSpan);
      itemEl.appendChild(nameInput);
      itemEl.appendChild(actionsDiv);

      // Selection Event
      itemEl.addEventListener('click', () => {
        appState.selectedLayer = layer;
        onStateChange();
      });

      // Drag & Drop Reordering and Nesting
      itemEl.addEventListener('dragstart', (e) => {
        draggedLayerId = layer.id;
        e.dataTransfer.setData('text/plain', layer.id);
        e.dataTransfer.effectAllowed = 'move';
        itemEl.classList.add('dragging');
      });

      itemEl.addEventListener('dragend', () => {
        itemEl.classList.remove('dragging');
        document.querySelectorAll('.layer-item').forEach(el => {
          el.classList.remove('drag-over', 'drag-over-inside');
        });
      });

      itemEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedLayerId === layer.id) return;

        const rect = itemEl.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const height = rect.height;

        itemEl.classList.remove('drag-over', 'drag-over-inside');

        if (offsetY < height * 0.25) {
          dragPosition = 'before';
          itemEl.classList.add('drag-over');
        } else if (offsetY > height * 0.75) {
          dragPosition = 'after';
          itemEl.classList.add('drag-over');
        } else {
          dragPosition = 'inside';
          itemEl.classList.add('drag-over-inside');
        }
      });

      itemEl.addEventListener('dragleave', () => {
        itemEl.classList.remove('drag-over', 'drag-over-inside');
      });

      itemEl.addEventListener('drop', (e) => {
        e.preventDefault();
        itemEl.classList.remove('drag-over', 'drag-over-inside');
        if (!draggedLayerId || draggedLayerId === layer.id) return;

        moveLayer(draggedLayerId, layer.id, dragPosition || 'after');
      });

      itemWrapper.appendChild(itemEl);

      // Rekursiv Kinder rendern mit Einrückung
      if (layer.children && layer.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'layer-children';
        layer.children.forEach(child => {
          childrenContainer.appendChild(createLayerItemEl(child, depth + 1));
        });
        itemWrapper.appendChild(childrenContainer);
      }

      return itemWrapper;
    };

    appState.layers.forEach(layer => {
      layersTreeEl.appendChild(createLayerItemEl(layer));
    });
  };

  /**
   * Toolbar-Aktionen zum Hinzufügen neuer Elemente
   */
  const initToolbarButtons = () => {
    const addLayerWithType = (type) => {
      const newL = createLayer({ type });
      if (appState.selectedLayer && appState.selectedLayer.type === ELEMENT_TYPES.MANDALA) {
        appState.selectedLayer.children.push(newL);
      } else {
        appState.layers.push(newL);
      }
      appState.selectedLayer = newL;
      onStateChange();
    };

    document.getElementById('btn-layer-new-circle')?.addEventListener('click', () => addLayerWithType(ELEMENT_TYPES.CIRCLE));
    document.getElementById('btn-layer-new-rect')?.addEventListener('click', () => addLayerWithType(ELEMENT_TYPES.RECT));
    document.getElementById('btn-layer-new-tri')?.addEventListener('click', () => addLayerWithType(ELEMENT_TYPES.TRIANGLE));
    document.getElementById('btn-layer-new-text')?.addEventListener('click', () => addLayerWithType(ELEMENT_TYPES.TEXT));
    document.getElementById('btn-layer-new-path')?.addEventListener('click', () => addLayerWithType(ELEMENT_TYPES.PATH));
    document.getElementById('btn-layer-new-mandala')?.addEventListener('click', () => addLayerWithType(ELEMENT_TYPES.MANDALA));
  };

  initWindowControls();
  initToolbarButtons();

  return {
    render: renderTree,
    addLayerWithType: (type) => {
      const newL = createLayer({ type });
      appState.layers.push(newL);
      appState.selectedLayer = newL;
      onStateChange();
    }
  };
};

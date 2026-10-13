/**
 * Eigenschaften-Inspektor (Rechte Sidebar)
 * Generiert dynamische Formulare für die aktuell ausgewählte Ebene.
 * Ausschließlich Arrow-Funktionen.
 */
import { ELEMENT_TYPES, getDefaultName } from './layer.js';

export const createPropertiesInspector = (container, appState, onUpdate, pathEditor) => {

  const createSection = (title) => {
    const section = document.createElement('div');
    section.className = 'prop-section';
    const titleEl = document.createElement('div');
    titleEl.className = 'prop-section-title';
    titleEl.textContent = title;
    section.appendChild(titleEl);
    return section;
  };

  const createRow = (label, inputEl) => {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'prop-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);
    row.appendChild(inputEl);
    return row;
  };

  const createSliderInput = (min, max, step, value, onChange) => {
    const wrap = document.createElement('div');
    wrap.className = 'input-with-slider';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;

    const num = document.createElement('input');
    num.type = 'number';
    num.className = 'form-input';
    num.min = min;
    num.max = max;
    num.step = step;
    num.value = value;

    slider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      num.value = v;
      onChange(v);
    });

    num.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value) || 0;
      slider.value = v;
      onChange(v);
    });

    wrap.appendChild(slider);
    wrap.appendChild(num);
    return wrap;
  };

  const render = () => {
    container.innerHTML = '';
    const layer = appState.selectedLayer;

    if (!layer) {
      container.innerHTML = '<div class="empty-selection-msg">Keine Ebene ausgewählt.<br>Wählen Sie eine Ebene aus oder erstellen Sie eine neue.</div>';
      return;
    }

    // 1. ALLGEMEINE INFOS & TYP
    const secGeneral = createSection('Allgemein');
    
    // Name
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-input';
    nameInput.value = layer.name;
    nameInput.addEventListener('input', (e) => {
      layer.name = e.target.value;
      onUpdate(false);
    });
    secGeneral.appendChild(createRow('Name', nameInput));

    // Typ-Selector
    const typeSelect = document.createElement('select');
    typeSelect.className = 'form-input';
    [
      { val: ELEMENT_TYPES.CIRCLE, label: 'Kreis' },
      { val: ELEMENT_TYPES.RECT, label: 'Rechteck' },
      { val: ELEMENT_TYPES.TRIANGLE, label: 'Dreieck' },
      { val: ELEMENT_TYPES.TEXT, label: 'Text' },
      { val: ELEMENT_TYPES.PATH, label: 'Pfad' },
      { val: ELEMENT_TYPES.MANDALA, label: 'Verschachteltes Mandala' }
    ].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.val;
      opt.textContent = t.label;
      opt.selected = layer.type === t.val;
      typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener('change', (e) => {
      layer.type = e.target.value;
      render();
      onUpdate(true);
    });
    secGeneral.appendChild(createRow('Element-Typ', typeSelect));
    container.appendChild(secGeneral);

    // 2. ELEMENT-SPEZIFISCHE EIGENSCHAFTEN
    if (layer.type === ELEMENT_TYPES.CIRCLE) {
      const secCircle = createSection('Kreis Optionen');
      secCircle.appendChild(createRow('Radius', createSliderInput(1, 400, 1, layer.circle.radius, (v) => {
        layer.circle.radius = v;
        onUpdate(false);
      })));
      secCircle.appendChild(createRow('Startwinkel', createSliderInput(0, 360, 1, layer.circle.startAngle, (v) => {
        layer.circle.startAngle = v;
        onUpdate(false);
      })));
      secCircle.appendChild(createRow('Endwinkel', createSliderInput(0, 360, 1, layer.circle.endAngle, (v) => {
        layer.circle.endAngle = v;
        onUpdate(false);
      })));
      container.appendChild(secCircle);
    } else if (layer.type === ELEMENT_TYPES.RECT) {
      const secRect = createSection('Rechteck Optionen');
      secRect.appendChild(createRow('Breite', createSliderInput(1, 500, 1, layer.rect.width, (v) => {
        layer.rect.width = v;
        onUpdate(false);
      })));
      secRect.appendChild(createRow('Höhe', createSliderInput(1, 500, 1, layer.rect.height, (v) => {
        layer.rect.height = v;
        onUpdate(false);
      })));
      secRect.appendChild(createRow('Winkel', createSliderInput(-180, 180, 1, layer.rect.angle, (v) => {
        layer.rect.angle = v;
        onUpdate(false);
      })));
      container.appendChild(secRect);
    } else if (layer.type === ELEMENT_TYPES.TRIANGLE) {
      const secTri = createSection('Dreieck Optionen');
      secTri.appendChild(createRow('Breite', createSliderInput(1, 500, 1, layer.triangle.width, (v) => {
        layer.triangle.width = v;
        onUpdate(false);
      })));
      secTri.appendChild(createRow('Höhe', createSliderInput(1, 500, 1, layer.triangle.height, (v) => {
        layer.triangle.height = v;
        onUpdate(false);
      })));
      secTri.appendChild(createRow('Winkel', createSliderInput(-180, 180, 1, layer.triangle.angle, (v) => {
        layer.triangle.angle = v;
        onUpdate(false);
      })));
      container.appendChild(secTri);
    } else if (layer.type === ELEMENT_TYPES.TEXT) {
      const secText = createSection('Text Optionen');
      const textVal = document.createElement('input');
      textVal.type = 'text';
      textVal.className = 'form-input';
      textVal.value = layer.text.text;
      textVal.addEventListener('input', (e) => {
        layer.text.text = e.target.value;
        onUpdate(false);
      });
      secText.appendChild(createRow('Text', textVal));

      const fontVal = document.createElement('input');
      fontVal.type = 'text';
      fontVal.className = 'form-input';
      fontVal.value = layer.text.fontFamily;
      fontVal.addEventListener('input', (e) => {
        layer.text.fontFamily = e.target.value;
        onUpdate(false);
      });
      secText.appendChild(createRow('Schriftart', fontVal));

      secText.appendChild(createRow('Schriftgröße', createSliderInput(6, 200, 1, layer.text.fontSize, (v) => {
        layer.text.fontSize = v;
        onUpdate(false);
      })));
      container.appendChild(secText);
    } else if (layer.type === ELEMENT_TYPES.PATH) {
      const secPath = createSection('Pfad Optionen');

      const closeRow = document.createElement('div');
      closeRow.className = 'prop-row';
      const closeLabel = document.createElement('span');
      closeLabel.className = 'prop-label';
      closeLabel.textContent = 'Pfad schließen';
      const closeCb = document.createElement('input');
      closeCb.type = 'checkbox';
      closeCb.checked = layer.path.closed;
      closeCb.addEventListener('change', (e) => {
        layer.path.closed = e.target.checked;
        onUpdate(false);
      });
      closeRow.appendChild(closeLabel);
      closeRow.appendChild(closeCb);
      secPath.appendChild(closeRow);

      const btnRow = document.createElement('div');
      btnRow.className = 'prop-row-dual';
      const addPtBtn = document.createElement('button');
      addPtBtn.className = 'btn btn-secondary';
      addPtBtn.textContent = '+ Punkt';
      addPtBtn.addEventListener('click', () => {
        if (pathEditor) pathEditor.addPointToActivePath(0, 40);
      });

      const delPtBtn = document.createElement('button');
      delPtBtn.className = 'btn btn-secondary';
      delPtBtn.textContent = '- Punkt';
      delPtBtn.addEventListener('click', () => {
        if (pathEditor) pathEditor.removePointFromActivePath();
      });

      btnRow.appendChild(addPtBtn);
      btnRow.appendChild(delPtBtn);
      secPath.appendChild(btnRow);

      container.appendChild(secPath);
    }

    // 3. STYLING (Farben, Linienstärke, Opazität)
    const secStyle = createSection('Aussehen / Style');

    // Stroke Color & Linienstärke
    const strokeRow = document.createElement('div');
    strokeRow.className = 'prop-row';
    const strokeLabel = document.createElement('span');
    strokeLabel.className = 'prop-label';
    strokeLabel.textContent = 'Kontur';
    const strokeColor = document.createElement('input');
    strokeColor.type = 'color';
    strokeColor.value = layer.strokeColor && layer.strokeColor !== 'transparent' ? layer.strokeColor : '#ffffff';
    strokeColor.addEventListener('input', (e) => {
      layer.strokeColor = e.target.value;
      onUpdate(false);
    });
    strokeRow.appendChild(strokeLabel);
    strokeRow.appendChild(strokeColor);
    secStyle.appendChild(strokeRow);

    secStyle.appendChild(createRow('Liniendicke', createSliderInput(0, 30, 0.5, layer.lineWidth, (v) => {
      layer.lineWidth = v;
      onUpdate(false);
    })));

    // Fill Color
    const fillRow = document.createElement('div');
    fillRow.className = 'prop-row';
    const fillLabel = document.createElement('span');
    fillLabel.className = 'prop-label';
    fillLabel.textContent = 'Füllung';

    const fillWrap = document.createElement('div');
    fillWrap.style.display = 'flex';
    fillWrap.style.alignItems = 'center';
    fillWrap.style.gap = '8px';

    const fillColor = document.createElement('input');
    fillColor.type = 'color';
    fillColor.value = layer.fillColor && layer.fillColor !== 'transparent' ? layer.fillColor : '#6366f1';
    fillColor.disabled = layer.fillColor === 'transparent';

    const fillTransCb = document.createElement('input');
    fillTransCb.type = 'checkbox';
    fillTransCb.checked = layer.fillColor === 'transparent';
    fillTransCb.title = "Transparent";
    const fillTransLabel = document.createElement('span');
    fillTransLabel.style.fontSize = '0.75rem';
    fillTransLabel.textContent = 'Keine';

    fillTransCb.addEventListener('change', (e) => {
      if (e.target.checked) {
        layer.fillColor = 'transparent';
        fillColor.disabled = true;
      } else {
        layer.fillColor = fillColor.value;
        fillColor.disabled = false;
      }
      onUpdate(false);
    });

    fillColor.addEventListener('input', (e) => {
      layer.fillColor = e.target.value;
      onUpdate(false);
    });

    fillWrap.appendChild(fillColor);
    fillWrap.appendChild(fillTransCb);
    fillWrap.appendChild(fillTransLabel);
    fillRow.appendChild(fillLabel);
    fillRow.appendChild(fillWrap);
    secStyle.appendChild(fillRow);

    // Opacity
    secStyle.appendChild(createRow('Deckkraft', createSliderInput(0, 1, 0.01, layer.opacity, (v) => {
      layer.opacity = v;
      onUpdate(false);
    })));

    container.appendChild(secStyle);

    // 4. TRANSFORMATION & POSITION
    const secTransform = createSection('Position & Drehung');
    secTransform.appendChild(createRow('Position X', createSliderInput(-500, 500, 1, layer.position.x, (v) => {
      layer.position.x = v;
      onUpdate(false);
    })));
    secTransform.appendChild(createRow('Position Y', createSliderInput(-500, 500, 1, layer.position.y, (v) => {
      layer.position.y = v;
      onUpdate(false);
    })));
    secTransform.appendChild(createRow('Rotation', createSliderInput(-180, 180, 1, layer.rotation, (v) => {
      layer.rotation = v;
      onUpdate(false);
    })));
    container.appendChild(secTransform);

    // 5. WIEDERHOLUNG & SYMMETRIE (Kopien, Gesamtwinkel, Offset, Skalierung, Fixpunkt)
    const secSymmetry = createSection('Symmetrie / Kopien');
    secSymmetry.appendChild(createRow('Anzahl Kopien', createSliderInput(1, 64, 1, layer.copies, (v) => {
      layer.copies = parseInt(v);
      onUpdate(false);
    })));
    secSymmetry.appendChild(createRow('Gesamtwinkel', createSliderInput(1, 360, 1, layer.totalAngle, (v) => {
      layer.totalAngle = v;
      onUpdate(false);
    })));
    secSymmetry.appendChild(createRow('Offset X', createSliderInput(-100, 100, 1, layer.copyOffset.x, (v) => {
      layer.copyOffset.x = v;
      onUpdate(false);
    })));
    secSymmetry.appendChild(createRow('Offset Y', createSliderInput(-100, 100, 1, layer.copyOffset.y, (v) => {
      layer.copyOffset.y = v;
      onUpdate(false);
    })));
    secSymmetry.appendChild(createRow('Skalierung', createSliderInput(0.5, 1.5, 0.01, layer.copyScale, (v) => {
      layer.copyScale = v;
      onUpdate(false);
    })));
    secSymmetry.appendChild(createRow('Kopie Opacity', createSliderInput(0, 1, 0.01, layer.copyOpacity, (v) => {
      layer.copyOpacity = v;
      onUpdate(false);
    })));
    secSymmetry.appendChild(createRow('Fixpunkt X', createSliderInput(-300, 300, 1, layer.pivot.x, (v) => {
      layer.pivot.x = v;
      onUpdate(false);
    })));
    secSymmetry.appendChild(createRow('Fixpunkt Y', createSliderInput(-300, 300, 1, layer.pivot.y, (v) => {
      layer.pivot.y = v;
      onUpdate(false);
    })));
    container.appendChild(secSymmetry);
  };

  return {
    render
  };
};

/**
 * Export-Manager für Mandalas (SVG, PNG, JPG).
 * Nutzt Promises (then-Chaining) und Web Worker für asynchrone Verarbeitung.
 * Ausschließlich Arrow-Funktionen.
 */
import { generateMandalaSvg } from './renderer.js';

export const createExportManager = (appState) => {
  let exportWorker = null;

  // Web Worker initialisieren
  const getWorker = () => {
    if (!exportWorker) {
      exportWorker = new Worker('js/exportWorker.js');
    }
    return exportWorker;
  };

  /**
   * Startet einen Dateidownload im Browser
   */
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  };

  /**
   * Exportiert das Mandala als SVG (Vektorgrafik auf Beschreibungsbasis)
   */
  const exportAsSvg = (size = 1200, transparentBg = true) => {
    return new Promise((resolve) => {
      // Promise mit then-chaining
      resolve({ size, transparentBg });
    }).then(({ size, transparentBg }) => {
      const svgString = generateMandalaSvg(appState.layers, size, transparentBg);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      return { blob, filename: `mandala_${Date.now()}.svg` };
    }).then(({ blob, filename }) => {
      triggerDownload(blob, filename);
      return { success: true };
    });
  };

  /**
   * Fallback-Rendering auf Haupt-Thread falls Web Worker / OffscreenCanvas nicht unterstützt wird
   */
  const fallbackRenderRaster = (size, format, transparentBg) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!transparentBg || format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
      }

      ctx.save();
      ctx.translate(size / 2, size / 2);
      const scale = size / 800;
      ctx.scale(scale, scale);

      // SVG zu Image zeichnen oder direkt zeichnen
      const svgString = generateMandalaSvg(appState.layers, 800, transparentBg && format !== 'jpg');
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, -400, -400);
        URL.revokeObjectURL(url);
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, mimeType, 0.95);
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    });
  };

  /**
   * Exportiert das Mandala als PNG oder JPG über den Web Worker
   */
  const exportAsRasterWorker = (size = 1200, format = 'png', transparentBg = true) => {
    return new Promise((resolve, reject) => {
      const worker = getWorker();

      const handleMessage = (e) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);

        if (e.data && e.data.success && e.data.blob) {
          resolve(e.data.blob);
        } else {
          // Falls OffscreenCanvas im Worker nicht unterstützt: Fallback
          fallbackRenderRaster(size, format, transparentBg)
            .then(blob => resolve(blob))
            .catch(err => reject(err));
        }
      };

      const handleError = (err) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        fallbackRenderRaster(size, format, transparentBg)
          .then(blob => resolve(blob))
          .catch(fallbackErr => reject(fallbackErr));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      worker.postMessage({
        layers: JSON.parse(JSON.stringify(appState.layers)),
        size,
        format,
        transparentBg
      });
    });
  };

  /**
   * Zentrale Export-Methode mit Promise then-Chaining
   */
  const exportMandala = (options = {}) => {
    const format = options.format || 'svg';
    const size = parseInt(options.size) || 1200;
    const transparentBg = options.transparentBg !== undefined ? options.transparentBg : true;

    return new Promise((resolve) => {
      resolve({ format, size, transparentBg });
    }).then(({ format, size, transparentBg }) => {
      if (format === 'svg') {
        return exportAsSvg(size, transparentBg);
      } else {
        return exportAsRasterWorker(size, format, transparentBg).then((blob) => {
          const ext = format === 'jpg' ? 'jpg' : 'png';
          triggerDownload(blob, `mandala_${Date.now()}.${ext}`);
          return { success: true };
        });
      }
    });
  };

  /**
   * Initialisiert das Modal Dialog UI
   */
  const initDialog = () => {
    const modal = document.getElementById('export-modal');
    const btnOpen = document.getElementById('btn-export-dialog');
    const btnClose = document.getElementById('btn-close-export');
    const btnCancel = document.getElementById('btn-cancel-export');
    const btnDoExport = document.getElementById('btn-do-export');
    const formatSelect = document.getElementById('export-format');
    const sizeInput = document.getElementById('export-size');
    const transparentCb = document.getElementById('export-bg-transparent');
    const progressEl = document.getElementById('export-progress');
    const bgGroup = document.getElementById('export-bg-group');

    const openModal = () => {
      modal.style.display = 'flex';
    };

    const closeModal = () => {
      modal.style.display = 'none';
      progressEl.style.display = 'none';
      btnDoExport.disabled = false;
    };

    btnOpen?.addEventListener('click', openModal);
    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);

    // Format-Umschaltung
    formatSelect?.addEventListener('change', () => {
      if (formatSelect.value === 'jpg') {
        bgGroup.style.display = 'none';
      } else {
        bgGroup.style.display = 'block';
      }
    });

    // Quick Size Buttons
    document.querySelectorAll('.quick-sizes .btn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.quick-sizes .btn-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        sizeInput.value = chip.dataset.size;
      });
    });

    btnDoExport?.addEventListener('click', () => {
      const format = formatSelect.value;
      const size = parseInt(sizeInput.value) || 1200;
      const transparentBg = transparentCb.checked;

      btnDoExport.disabled = true;
      progressEl.style.display = 'flex';

      // Promise Chain
      exportMandala({ format, size, transparentBg })
        .then(() => {
          closeModal();
        })
        .catch(err => {
          console.error("Export Fehler:", err);
          alert("Fehler beim Export: " + err.message);
          closeModal();
        });
    });
  };

  return {
    initDialog,
    exportMandala
  };
};

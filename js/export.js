import { state, getActiveParticle, rerender } from './state.js';
import { draw, canvas } from './renderer.js';
import { genId } from './utils.js';

export function setupExportHandlers() {
  document.getElementById('btn-export-png').onclick = () => {
    const bg = document.getElementById('export-bg-select').value;
    const mode = bg === 'transparent' ? 1 : 0;
    draw(mode);
    const link = document.createElement('a');
    link.download = 'particle.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    draw();
  };

  document.getElementById('btn-export-json').onclick = () => {
    const particle = getActiveParticle();
    const blob = new Blob([JSON.stringify(particle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${particle.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('btn-import-json').onclick = () => {
    document.getElementById('import-file').click();
  };

  document.getElementById('import-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported.layers)) throw new Error('Invalid JSON: missing layers array');
        imported.id = genId();
        imported.name = imported.name || 'Imported';
        imported.layers.forEach(l => {
          if (l.enabled === undefined) l.enabled = true;
        });
        state.particles.push(imported);
        state.activeParticleId = imported.id;
        state.selectedLayerId = imported.layers[0]?.id || null;
        rerender();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
}

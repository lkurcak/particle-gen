import { state, getActiveParticle, rerender } from './state.js';
import { exportToDataURL, drawToCanvas } from './renderer.js';
import { genId, APP_VERSION } from './utils.js';

export function setupExportHandlers() {
  document.getElementById('btn-export-png').onclick = () => {
    const mode = state.exportBg === 'transparent' ? 1 : 0;
    const url = exportToDataURL(mode);
    // If url is null, offscreen canvas is handling the download asynchronously
    if (url) {
      const link = document.createElement('a');
      link.download = 'particle.png';
      link.href = url;
      link.click();
    }
  };

  document.getElementById('btn-export-json').onclick = () => {
    const particle = getActiveParticle();
    const exportData = {
      metadata: {
        version: APP_VERSION,
        createdAt: new Date().toISOString(),
        exportedFrom: window.location.href,
        tool: 'Particle SDF Generator'
      },
      particle: particle
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
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
        const parsed = JSON.parse(ev.target.result);
        
        // Handle both old format (direct particle) and new format (with metadata)
        let imported;
        if (parsed.metadata && parsed.particle) {
          imported = parsed.particle;
        } else {
          imported = parsed;
        }
        
        if (!Array.isArray(imported.layers)) throw new Error('Invalid JSON: missing layers array');
        imported.id = genId();
        imported.name = imported.name || 'Imported';
        imported.layers.forEach(l => {
          if (l.enabled === undefined) l.enabled = true;
          // Migrate old blend mode names
          if (l.blendMode === 'add') l.blendMode = 'union';
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

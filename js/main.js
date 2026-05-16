import { genId } from './utils.js';
import { state, setRerender, loadState, saveState } from './state.js';
import { draw, resize } from './renderer.js';
import { renderTabs } from './ui/tabs.js';
import { renderLayers } from './ui/layers.js';
import { renderParams } from './ui/params.js';
import { setupExportHandlers } from './export.js';

function renderAll() {
  renderTabs();
  renderLayers();
  renderParams();
  draw();
  saveState();
}

setRerender(renderAll);

document.getElementById('btn-add-layer').onclick = () => {
  const particle = state.particles.find(p => p.id === state.activeParticleId);
  if (!particle) return;
  const type = document.getElementById('new-layer-type').value;
  const newLayer = {
    id: genId(),
    type,
    blendMode: 'union',
    enabled: true,
    params: type === 'circle'
      ? { x: 0, y: 0, radius: 0.5, falloff: 0.05 }
      : { x: 0, y: 0, width: 0.5, height: 0.5, roundness: 0, falloff: 0.05 }
  };
  particle.layers.push(newLayer);
  state.selectedLayerId = newLayer.id;
  renderAll();
};

function syncPreviewBg() {
  const container = document.getElementById('canvas-container');
  if (state.previewBg === 'checkerboard') {
    container.classList.add('checkerboard');
    container.style.background = '';
  } else {
    container.classList.remove('checkerboard');
    container.style.background = '#000';
  }
}

function syncStaticControls() {
  document.getElementById('preview-bg-select').value = state.previewBg;
  document.getElementById('export-bg-select').value = state.exportBg;
  document.getElementById('export-size-select').value = String(state.exportSize);
  syncPreviewBg();
}

document.getElementById('preview-bg-select').onchange = (e) => {
  state.previewBg = e.target.value;
  syncPreviewBg();
  draw();
  saveState();
};

document.getElementById('export-bg-select').onchange = (e) => {
  state.exportBg = e.target.value;
  saveState();
};

document.getElementById('export-size-select').onchange = (e) => {
  state.exportSize = parseInt(e.target.value, 10);
  resize();
  saveState();
};

setupExportHandlers();

loadState();
syncStaticControls();

requestAnimationFrame(() => {
  resize();
  renderAll();
});

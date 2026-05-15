import { genId, createDefaultParticle } from './utils.js';
import { state, setRerender } from './state.js';
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
}

setRerender(renderAll);

document.getElementById('btn-add-layer').onclick = () => {
  const particle = state.particles.find(p => p.id === state.activeParticleId);
  if (!particle) return;
  const type = document.getElementById('new-layer-type').value;
  const newLayer = {
    id: genId(),
    type,
    blendMode: 'add',
    enabled: true,
    params: type === 'circle'
      ? { x: 0, y: 0, radius: 0.5, falloff: 0.05 }
      : { x: 0, y: 0, width: 0.5, height: 0.5, roundness: 0, falloff: 0.05 }
  };
  particle.layers.push(newLayer);
  state.selectedLayerId = newLayer.id;
  renderAll();
};

document.getElementById('preview-bg-select').onchange = (e) => {
  state.previewBg = e.target.value;
  const container = document.getElementById('canvas-container');
  if (state.previewBg === 'checkerboard') {
    container.classList.add('checkerboard');
    container.style.background = '';
  } else {
    container.classList.remove('checkerboard');
    container.style.background = '#000';
  }
  draw();
};

setupExportHandlers();

window.addEventListener('resize', resize);
requestAnimationFrame(() => {
  resize();
  renderAll();
});

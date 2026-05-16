import { state, getActiveParticle, rerender } from '../state.js';
import { draw } from '../renderer.js';
import { renderLayers } from './layers.js';

export function renderParams() {
  const particle = getActiveParticle();
  const container = document.getElementById('params-content');
  container.innerHTML = '';

  if (!particle) {
    container.innerHTML = '<div class="empty-state">No active particle</div>';
    return;
  }
  const layer = particle.layers.find(l => l.id === state.selectedLayerId);
  if (!layer) {
    container.innerHTML = '<div class="empty-state">Select a layer to edit</div>';
    return;
  }

  const title = document.createElement('div');
  title.id = 'params-title';
  title.textContent = (layer.type.charAt(0).toUpperCase() + layer.type.slice(1)) + ' Parameters';
  container.appendChild(title);

  const makeRow = (label, key, min, max, step) => {
    const row = document.createElement('div');
    row.className = 'param-row';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const range = document.createElement('input');
    range.type = 'range';
    range.min = min;
    range.max = max;
    range.step = step;
    range.value = layer.params[key];

    const num = document.createElement('input');
    num.type = 'number';
    num.min = min;
    num.max = max;
    num.step = step;
    num.value = parseFloat(layer.params[key]).toFixed(4);

    const set = (v) => {
      const val = parseFloat(v);
      layer.params[key] = val;
      range.value = val;
      num.value = val.toFixed(4);
      draw();
      renderLayers();
    };

    range.addEventListener('input', (e) => set(e.target.value));
    num.addEventListener('input', (e) => set(e.target.value));

    row.appendChild(lbl);
    row.appendChild(range);
    row.appendChild(num);
    container.appendChild(row);
  };

  if (layer.type === 'circle') {
    makeRow('X', 'x', -2, 2, 0.001);
    makeRow('Y', 'y', -2, 2, 0.001);
    makeRow('Radius', 'radius', 0, 2, 0.001);
    makeRow('Falloff', 'falloff', 0.001, 1, 0.001);
  } else if (layer.type === 'rectangle') {
    makeRow('X', 'x', -2, 2, 0.001);
    makeRow('Y', 'y', -2, 2, 0.001);
    makeRow('Half-width', 'width', 0, 2, 0.001);
    makeRow('Half-height', 'height', 0, 2, 0.001);
    makeRow('Roundness', 'roundness', 0, 1, 0.001);
    makeRow('Falloff', 'falloff', 0.001, 1, 0.001);
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'danger';
  delBtn.style.marginTop = '8px';
  delBtn.style.width = '100%';
  delBtn.textContent = 'Delete Layer';
  delBtn.onclick = () => {
    const idx = particle.layers.findIndex(l => l.id === layer.id);
    particle.layers.splice(idx, 1);
    state.selectedLayerId = particle.layers[Math.max(0, idx - 1)]?.id || null;
    rerender();
  };
  container.appendChild(delBtn);
}

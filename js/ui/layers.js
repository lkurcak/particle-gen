import { state, getActiveParticle, rerender } from '../state.js';

let isCustomDragging = false;
let dragState = null;

function onDragMove(e) {
  if (!dragState) return;
  const { ghost, placeholder, list, offsetX, offsetY, siblings } = dragState;

  ghost.style.left = (e.clientX - offsetX) + 'px';
  ghost.style.top = (e.clientY - offsetY) + 'px';

  const children = Array.from(list.children).filter(c => c !== placeholder);
  let newIndex = children.length;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const box = child.getBoundingClientRect();
    const center = box.top + box.height / 2;
    if (e.clientY < center) {
      newIndex = i;
      break;
    }
  }

  const currentPlaceholderIndex = Array.from(list.children).indexOf(placeholder);
  if (newIndex !== currentPlaceholderIndex) {
    const beforeRects = new Map();
    siblings.forEach(s => beforeRects.set(s, s.getBoundingClientRect()));

    if (newIndex < children.length) {
      list.insertBefore(placeholder, children[newIndex]);
    } else {
      list.appendChild(placeholder);
    }

    const afterRects = new Map();
    siblings.forEach(s => afterRects.set(s, s.getBoundingClientRect()));

    siblings.forEach(s => {
      const b = beforeRects.get(s);
      const a = afterRects.get(s);
      const dy = b.top - a.top;
      if (dy !== 0) {
        s.style.transition = 'none';
        s.style.transform = `translateY(${dy}px)`;
      } else {
        s.style.transform = '';
        s.style.transition = '';
      }
    });

    document.body.offsetHeight;

    siblings.forEach(s => {
      s.style.transition = 'transform 0.2s ease';
      s.style.transform = '';
    });
  }
}

function onDragEnd(e) {
  if (!dragState) return;
  const { particle, placeholder, ghost, originalIndex, list, siblings } = dragState;

  const finalIndex = Array.from(list.children).indexOf(placeholder);

  ghost.remove();
  placeholder.remove();
  siblings.forEach(s => {
    s.style.transition = '';
    s.style.transform = '';
  });

  if (finalIndex !== -1 && finalIndex !== originalIndex) {
    const [moved] = particle.layers.splice(originalIndex, 1);
    particle.layers.splice(finalIndex, 0, moved);
  }

  const targetLayer = particle.layers[finalIndex !== -1 ? finalIndex : originalIndex];
  if (targetLayer) state.selectedLayerId = targetLayer.id;

  dragState = null;
  isCustomDragging = false;
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);

  rerender();
}

export function renderLayers() {
  if (isCustomDragging) return;
  const particle = getActiveParticle();
  const list = document.getElementById('layers-list');
  list.innerHTML = '';
  if (!particle || particle.layers.length === 0) {
    list.innerHTML = '<div class="empty-state">No layers. Add one to start.</div>';
    return;
  }

  particle.layers.forEach((layer, index) => {
    const item = document.createElement('div');
    item.className = 'layer-item' + (layer.id === state.selectedLayerId ? ' selected' : '');
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '\u2630';
    handle.title = 'Drag to reorder';

    const info = document.createElement('div');
    info.className = 'layer-info';
    const typeDiv = document.createElement('div');
    typeDiv.className = 'layer-type';
    typeDiv.textContent = layer.type.charAt(0).toUpperCase() + layer.type.slice(1);
    const metaDiv = document.createElement('div');
    metaDiv.className = 'layer-meta';
    metaDiv.textContent = Object.entries(layer.params)
      .map(([k, v]) => `${k}: ${parseFloat(v).toFixed(3)}`).join(', ');
    info.appendChild(typeDiv);
    info.appendChild(metaDiv);

    const blend = document.createElement('select');
    blend.className = 'layer-blend';
    ['union', 'subtract', 'intersect'].forEach(mode => {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = mode;
      if (layer.blendMode === mode) opt.selected = true;
      blend.appendChild(opt);
    });
    blend.onchange = (e) => {
      layer.blendMode = e.target.value;
      rerender();
    };

    const visBtn = document.createElement('button');
    visBtn.className = 'layer-visibility' + (layer.enabled === false ? ' hidden' : '');
    visBtn.textContent = layer.enabled === false ? '\u1F6AB' : '\u1F441';
    visBtn.title = layer.enabled === false ? 'Enable layer' : 'Disable layer';
    visBtn.onclick = (e) => {
      e.stopPropagation();
      layer.enabled = layer.enabled === false;
      rerender();
    };

    item.appendChild(handle);
    item.appendChild(info);
    item.appendChild(blend);
    item.appendChild(visBtn);

    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.closest('.layer-visibility')) return;
      state.selectedLayerId = layer.id;
      rerender();
    });

    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      isCustomDragging = true;

      const list = document.getElementById('layers-list');
      const rect = item.getBoundingClientRect();

      const placeholder = document.createElement('div');
      placeholder.className = 'layer-placeholder';
      placeholder.style.height = rect.height + 'px';
      list.insertBefore(placeholder, item);
      item.remove();

      const ghost = item.cloneNode(true);
      ghost.classList.add('layer-ghost');
      ghost.style.width = rect.width + 'px';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      document.body.appendChild(ghost);

      const siblings = Array.from(list.children).filter(c => c !== placeholder);

      dragState = {
        particle,
        placeholder,
        ghost,
        originalIndex: index,
        list,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        siblings
      };

      window.addEventListener('mousemove', onDragMove);
      window.addEventListener('mouseup', onDragEnd);
    });

    list.appendChild(item);
  });
}

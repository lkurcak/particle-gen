import { genId, createDefaultParticle } from '../utils.js';
import { state, rerender } from '../state.js';

export function renderTabs() {
  const el = document.getElementById('tabs');
  el.innerHTML = '';
  state.particles.forEach(p => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (p.id === state.activeParticleId ? ' active' : '');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = p.name;
    nameSpan.style.pointerEvents = 'none';
    tab.appendChild(nameSpan);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close tab';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      if (state.particles.length <= 1) {
        return;
      }
      const idx = state.particles.findIndex(x => x.id === p.id);
      state.particles.splice(idx, 1);
      if (state.activeParticleId === p.id) {
        const next = state.particles[Math.max(0, idx - 1)];
        state.activeParticleId = next.id;
        state.selectedLayerId = next.layers[0]?.id || null;
      }
      rerender();
    };
    tab.appendChild(closeBtn);

    tab.onclick = () => {
      state.activeParticleId = p.id;
      state.selectedLayerId = p.layers[0]?.id || null;
      rerender();
    };

    el.appendChild(tab);
  });

  const addTab = document.createElement('div');
  addTab.className = 'tab';
  addTab.id = 'tab-add';
  addTab.textContent = '+';
  addTab.title = 'New particle';
  addTab.onclick = () => {
    const newP = createDefaultParticle(genId(), `Particle ${state.particles.length + 1}`);
    state.particles.push(newP);
    state.activeParticleId = newP.id;
    state.selectedLayerId = newP.layers[0].id;
    rerender();
  };
  el.appendChild(addTab);
}

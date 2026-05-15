import { genId, createDefaultParticle } from './utils.js';

const STORAGE_KEY = 'particleGenState';

export const state = {
  particles: [createDefaultParticle(genId(), 'Particle 1')],
  activeParticleId: null,
  selectedLayerId: null,
  previewBg: 'checkerboard',
  exportBg: 'transparent',
  exportSize: 128
};
state.activeParticleId = state.particles[0].id;
state.selectedLayerId = state.particles[0].layers[0].id;

export function getActiveParticle() {
  return state.particles.find(p => p.id === state.activeParticleId);
}

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage might be full or disabled; silently ignore
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.particles) || saved.particles.length === 0) return false;

    // Validate IDs exist
    const validActive = saved.particles.some(p => p.id === saved.activeParticleId);
    const activeId = validActive ? saved.activeParticleId : saved.particles[0].id;
    const activeParticle = saved.particles.find(p => p.id === activeId);
    const validLayer = activeParticle?.layers?.some(l => l.id === saved.selectedLayerId);
    const layerId = validLayer ? saved.selectedLayerId : activeParticle?.layers?.[0]?.id ?? null;

    state.particles = saved.particles;
    state.activeParticleId = activeId;
    state.selectedLayerId = layerId;
    state.previewBg = saved.previewBg === 'black' ? 'black' : 'checkerboard';
    state.exportBg = saved.exportBg === 'black' ? 'black' : 'transparent';
    const validSizes = [32, 64, 128, 256, 512];
    state.exportSize = validSizes.includes(saved.exportSize) ? saved.exportSize : 128;

    return true;
  } catch (e) {
    return false;
  }
}

let _rerender = () => {};
export function setRerender(fn) { _rerender = fn; }
export function rerender() { _rerender(); }

import { genId, createDefaultParticle } from './utils.js';

export const state = {
  particles: [createDefaultParticle(genId(), 'Particle 1')],
  activeParticleId: null,
  selectedLayerId: null,
  previewBg: 'checkerboard'
};
state.activeParticleId = state.particles[0].id;
state.selectedLayerId = state.particles[0].layers[0].id;

export function getActiveParticle() {
  return state.particles.find(p => p.id === state.activeParticleId);
}

let _rerender = () => {};
export function setRerender(fn) { _rerender = fn; }
export function rerender() { _rerender(); }

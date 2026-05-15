export function genId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createDefaultParticle(id, name) {
  return {
    id,
    name,
    layers: [
      {
        id: genId(),
        type: 'circle',
        blendMode: 'add',
        enabled: true,
        params: { x: 0, y: 0, radius: 0.5, falloff: 0.05 }
      }
    ]
  };
}

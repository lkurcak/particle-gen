import { state } from './state.js';

export const canvas = document.getElementById('glcanvas');
export const gl = canvas.getContext('webgl', {
  premultipliedAlpha: false,
  alpha: true,
  preserveDrawingBuffer: true
});
if (!gl) {
  alert('WebGL is not supported in your browser.');
}

// Offscreen export canvas with its own WebGL context
const exportCanvas = document.createElement('canvas');
const exportGl = exportCanvas.getContext('webgl', {
  premultipliedAlpha: false,
  alpha: true,
  preserveDrawingBuffer: true
});

const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
const floatPrecision = (highp && highp.precision > 0) ? 'highp' : 'mediump';

const VS = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

function createShader(targetGl, type, source) {
  const s = targetGl.createShader(type);
  targetGl.shaderSource(s, source);
  targetGl.compileShader(s);
  if (!targetGl.getShaderParameter(s, targetGl.COMPILE_STATUS)) {
    console.error('Shader compile error:', targetGl.getShaderInfoLog(s));
    console.error(source);
    targetGl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(targetGl, vsSrc, fsSrc) {
  const vs = createShader(targetGl, targetGl.VERTEX_SHADER, vsSrc);
  const fs = createShader(targetGl, targetGl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const p = targetGl.createProgram();
  targetGl.attachShader(p, vs);
  targetGl.attachShader(p, fs);
  targetGl.linkProgram(p);
  if (!targetGl.getProgramParameter(p, targetGl.LINK_STATUS)) {
    console.error('Program link error:', targetGl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

function setupQuad(targetGl) {
  const buf = targetGl.createBuffer();
  const arr = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  targetGl.bindBuffer(targetGl.ARRAY_BUFFER, buf);
  targetGl.bufferData(targetGl.ARRAY_BUFFER, arr, targetGl.STATIC_DRAW);
  return buf;
}

const previewQuadBuf = setupQuad(gl);
const previewCache = { program: null, fsSource: '' };

const exportQuadBuf = setupQuad(exportGl);
const exportCache = { program: null, fsSource: '' };

function generateFragmentShader(particle) {
  const layers = particle.layers.filter(l => l.enabled !== false);

  const needCircle = layers.some(l => l.type === 'circle');
  const needRect  = layers.some(l => l.type === 'rectangle');

  let src = `precision ${floatPrecision} float;
uniform vec2 u_resolution;
uniform int u_bgMode;
uniform int u_previewMode;
uniform float u_coordScale;
`;

  if (needCircle) {
    src += `float sdCircle(vec2 p, vec2 c, float r) {
  return length(p - c) - r;
}
`;
  }
  if (needRect) {
    src += `float sdRectangle(vec2 p, vec2 c, vec2 b, float rad) {
  vec2 d = abs(p - c) - b + rad;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rad;
}
`;
  }

  src += `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * u_coordScale;
  float value = 0.0;
`;

  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const pr = l.params;
    const fo = Math.max(0.0001, pr.falloff);
    const n = `_${i}`;
    if (l.type === 'circle') {
      src += `  float d${n} = sdCircle(p, vec2(${pr.x.toFixed(5)}, ${pr.y.toFixed(5)}), ${pr.radius.toFixed(5)});\n`;
    } else if (l.type === 'rectangle') {
      src += `  float d${n} = sdRectangle(p, vec2(${pr.x.toFixed(5)}, ${pr.y.toFixed(5)}), vec2(${pr.width.toFixed(5)}, ${pr.height.toFixed(5)}), ${pr.roundness.toFixed(5)});\n`;
    }
    src += `  float m${n} = 1.0 - smoothstep(0.0, ${fo.toFixed(5)}, d${n});\n`;

    if (l.blendMode === 'add' || l.blendMode === 'union') {
      src += `  value = max(value, m${n});\n`;
    } else if (l.blendMode === 'subtract') {
      src += `  value = max(value - m${n}, 0.0);\n`;
    } else if (l.blendMode === 'intersect') {
      src += `  value = min(value, m${n});\n`;
    }
  }

  src += `
  vec4 color;
  int mode = u_bgMode;
  if (mode == 0) {
    color = vec4(vec3(value), 1.0);
  } else {
    color = vec4(vec3(1.0), value);
  }
  float margin = u_resolution.x * 0.25;
  bool outsideExport = gl_FragCoord.x < margin || gl_FragCoord.x > u_resolution.x - margin
                    || gl_FragCoord.y < margin || gl_FragCoord.y > u_resolution.y - margin;
  if (u_previewMode == 1 && value > 0.0 && outsideExport) {
    color = mix(color, vec4(1.0, 0.0, 0.0, color.a), 0.3);
  }
  gl_FragColor = color;
}
`;
  return src;
}

function drawToContext(targetGl, quadBuf, bgMode, previewMode, coordScale, cache) {
  const particle = state.particles.find(p => p.id === state.activeParticleId);
  if (!particle) return;

  const fsSrc = generateFragmentShader(particle);
  if (fsSrc !== cache.fsSource) {
    const prog = createProgram(targetGl, VS, fsSrc);
    if (prog) {
      if (cache.program) {
        targetGl.deleteProgram(cache.program);
      }
      cache.program = prog;
      cache.fsSource = fsSrc;
    } else {
      console.error('Failed to compile new shader');
      return;
    }
  }

  if (!cache.program) return;

  targetGl.useProgram(cache.program);

  const aPos = targetGl.getAttribLocation(cache.program, 'a_pos');
  targetGl.enableVertexAttribArray(aPos);
  targetGl.bindBuffer(targetGl.ARRAY_BUFFER, quadBuf);
  targetGl.vertexAttribPointer(aPos, 2, targetGl.FLOAT, false, 0, 0);

  const targetCanvas = targetGl.canvas;
  const uRes = targetGl.getUniformLocation(cache.program, 'u_resolution');
  targetGl.uniform2f(uRes, targetCanvas.width, targetCanvas.height);

  const uBg = targetGl.getUniformLocation(cache.program, 'u_bgMode');
  targetGl.uniform1i(uBg, bgMode);

  const uPreview = targetGl.getUniformLocation(cache.program, 'u_previewMode');
  targetGl.uniform1i(uPreview, previewMode ? 1 : 0);

  const uCoordScale = targetGl.getUniformLocation(cache.program, 'u_coordScale');
  targetGl.uniform1f(uCoordScale, coordScale);

  targetGl.viewport(0, 0, targetCanvas.width, targetCanvas.height);

  if (bgMode === 0) {
    targetGl.clearColor(0, 0, 0, 1);
  } else {
    targetGl.clearColor(0, 0, 0, 0);
  }
  targetGl.clear(targetGl.COLOR_BUFFER_BIT);

  targetGl.drawArrays(targetGl.TRIANGLE_STRIP, 0, 4);
}

export function draw(overrideBgMode) {
  let bgMode = state.previewBg === 'black' ? 0 : 1;
  if (typeof overrideBgMode === 'number') bgMode = overrideBgMode;
  drawToContext(gl, previewQuadBuf, bgMode, true, 4.0, previewCache);
}

export function resize() {
  const size = state.exportSize * 2;
  canvas.width = size;
  canvas.height = size;
  draw();
}

export function exportToDataURL(bgMode) {
  const size = state.exportSize;
  exportCanvas.width = size;
  exportCanvas.height = size;
  drawToContext(exportGl, exportQuadBuf, bgMode, false, 2.0, exportCache);
  return exportCanvas.toDataURL('image/png');
}

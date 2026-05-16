import { state } from './state.js';

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl', {
  premultipliedAlpha: false,
  alpha: true,
  preserveDrawingBuffer: true
});
if (!gl) {
  alert('WebGL is not supported in your browser.');
}

const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
const floatPrecision = (highp && highp.precision > 0) ? 'highp' : 'mediump';

const VS = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

function createShader(type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(s));
    console.error(source);
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(vsSrc, fsSrc) {
  const vs = createShader(gl.VERTEX_SHADER, vsSrc);
  const fs = createShader(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

const quadBuf = gl.createBuffer();
const quadArr = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, quadArr, gl.STATIC_DRAW);

let cachedProgram = null;
let cachedFsSource = '';

function generateFragmentShader(particle) {
  const layers = particle.layers.filter(l => l.enabled !== false);

  const needCircle = layers.some(l => l.type === 'circle');
  const needRect  = layers.some(l => l.type === 'rectangle');

  let src = `precision ${floatPrecision} float;
uniform vec2 u_resolution;
uniform int u_bgMode;
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
  vec2 p = (uv - 0.5) * 2.0;
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

    if (l.blendMode === 'add') {
      src += `  value = max(value, m${n});\n`;
    } else if (l.blendMode === 'subtract') {
      src += `  value = max(value - m${n}, 0.0);\n`;
    } else if (l.blendMode === 'intersect') {
      src += `  value = min(value, m${n});\n`;
    }
  }

  src += `
  int mode = u_bgMode;
  if (mode == 0) {
    gl_FragColor = vec4(vec3(value), 1.0);
  } else {
    gl_FragColor = vec4(vec3(1.0), value);
  }
}
`;
  return src;
}

export function draw(overrideBgMode) {
  const particle = state.particles.find(p => p.id === state.activeParticleId);
  if (!particle) return;

  const fsSrc = generateFragmentShader(particle);
  if (fsSrc !== cachedFsSource) {
    const prog = createProgram(VS, fsSrc);
    if (prog) {
      if (cachedProgram) {
        gl.deleteProgram(cachedProgram);
      }
      cachedProgram = prog;
      cachedFsSource = fsSrc;
    } else {
      console.error('Failed to compile new shader');
      return;
    }
  }

  if (!cachedProgram) return;

  gl.useProgram(cachedProgram);

  const aPos = gl.getAttribLocation(cachedProgram, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(cachedProgram, 'u_resolution');
  gl.uniform2f(uRes, canvas.width, canvas.height);

  const uBg = gl.getUniformLocation(cachedProgram, 'u_bgMode');
  let bgMode = state.previewBg === 'black' ? 0 : 1;
  if (typeof overrideBgMode === 'number') bgMode = overrideBgMode;
  gl.uniform1i(uBg, bgMode);

  gl.viewport(0, 0, canvas.width, canvas.height);

  if (bgMode === 0) {
    gl.clearColor(0, 0, 0, 1);
  } else {
    gl.clearColor(0, 0, 0, 0);
  }
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function resize() {
  const size = state.exportSize;
  canvas.width = size;
  canvas.height = size;
  draw();
}

export function exportToDataURL(bgMode) {
  draw(bgMode);
  const url = canvas.toDataURL('image/png');
  draw(); // restore preview
  return url;
}

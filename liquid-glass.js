const VERT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * .5 + .5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_press;
uniform float u_motion;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash21(i);
  float b = hash21(i+vec2(1.,0.));
  float c = hash21(i+vec2(0.,1.));
  float d = hash21(i+vec2(1.,1.));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p){
  float v = 0.;
  float a = .5;
  for(int i=0;i<4;i++){
    v += a*noise(p);
    p = p*2.03 + 17.3;
    a *= .5;
  }
  return v;
}

void main(){
  vec2 uv = v_uv;
  vec2 p = uv * 2. - 1.;
  p.x *= u_resolution.x / u_resolution.y;
  float r = length(p);

  float edge = smoothstep(1.0, .965, r);
  float rim = smoothstep(.99, .91, r) - smoothstep(.91, .80, r);
  float inner = smoothstep(.94, .05, r);

  vec2 ptr = u_pointer * 2. - 1.;
  ptr.x *= u_resolution.x / u_resolution.y;
  vec2 dir = p - ptr*.18;

  float n = fbm(p*2.4 + vec2(u_time*.055, -u_time*.035));
  float ripple = sin(r*16. - u_time*3.0) * exp(-r*3.4) * u_press * .10;
  vec2 distort = normalize(dir + .0001) * ((1.-r)*.025 + ripple) + (n-.5)*.024;

  vec2 q = p + distort;
  float qlen = length(q);
  float light = max(0., dot(
    normalize(vec3(q, sqrt(max(0., 1.-min(qlen,1.)*min(qlen,1.))))),
    normalize(vec3(-.6,.65,.8))
  ));
  float fresnel = pow(clamp(1. - sqrt(max(0., 1.-min(r,1.)*min(r,1.))), 0., 1.), 2.1);

  vec3 deep = vec3(.67, .0, .045);
  vec3 red = vec3(1.0, .015, .105);
  vec3 hot = vec3(1.0, .18, .24);
  vec3 col = mix(deep, red, .68 + .22*(1.-r));
  col = mix(col, hot, n*.18);
  col += light*.20;
  col += fresnel*vec3(.30,.10,.13);
  col += rim*vec3(.55,.35,.38);

  float glintA = exp(-length((p-vec2(-.36,.42))*vec2(1.1,2.3))*12.);
  float glintB = exp(-length((p-vec2(.45,.25))*vec2(1.8,3.0))*15.);
  col += vec3(1.)*(glintA*.95 + glintB*.50);

  float pointerGlow = exp(-length(p-ptr*.34)*4.2) * u_motion;
  col += pointerGlow*vec3(.24,.08,.10);

  float alpha = edge;
  col *= (.93 + .07*inner);
  outColor = vec4(col, alpha);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || 'Shader compile failed');
  }
  return shader;
}

function program(gl) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(message || 'Program link failed');
  }
  return p;
}

export function mountLiquidGlass(canvas, host) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const prog = program(gl);
  const pos = gl.getAttribLocation(prog, 'a_position');
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1,
    -1,1, 1,-1, 1,1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const loc = {
    resolution: gl.getUniformLocation(prog, 'u_resolution'),
    pointer: gl.getUniformLocation(prog, 'u_pointer'),
    time: gl.getUniformLocation(prog, 'u_time'),
    press: gl.getUniformLocation(prog, 'u_press'),
    motion: gl.getUniformLocation(prog, 'u_motion'),
  };

  gl.useProgram(prog);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const state = {
    pointer: [0.5, 0.5],
    target: [0.5, 0.5],
    press: 0,
    pressTarget: 0,
    motion: 0,
    last: performance.now(),
    running: true,
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function setPointer(e) {
    const rect = host.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    state.target[0] = Math.max(0, Math.min(1, x));
    state.target[1] = Math.max(0, Math.min(1, y));
    state.motion = 1;
  }

  const down = e => {
    setPointer(e);
    state.pressTarget = 1;
  };
  const move = e => setPointer(e);
  const up = () => {
    state.pressTarget = 0;
    state.target[0] = .5;
    state.target[1] = .5;
  };

  host.addEventListener('pointerdown', down, { passive: true });
  host.addEventListener('pointermove', move, { passive: true });
  host.addEventListener('pointerup', up, { passive: true });
  host.addEventListener('pointercancel', up, { passive: true });
  host.addEventListener('pointerleave', up, { passive: true });
  addEventListener('resize', resize, { passive: true });

  const io = new IntersectionObserver(([entry]) => {
    state.running = entry.isIntersecting;
  }, { threshold: .01 });
  io.observe(host);

  function frame(now) {
    resize();
    const dt = Math.min(32, now - state.last) / 16.6667;
    state.last = now;
    const ease = 1 - Math.pow(.82, dt);
    state.pointer[0] += (state.target[0] - state.pointer[0]) * ease;
    state.pointer[1] += (state.target[1] - state.pointer[1]) * ease;
    state.press += (state.pressTarget - state.press) * (1 - Math.pow(.72, dt));
    state.motion *= Math.pow(.94, dt);

    if (state.running) {
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(loc.resolution, canvas.width, canvas.height);
      gl.uniform2f(loc.pointer, state.pointer[0], state.pointer[1]);
      gl.uniform1f(loc.time, reduced ? 0 : now * .001);
      gl.uniform1f(loc.press, state.press);
      gl.uniform1f(loc.motion, state.motion);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return {
    destroy() {
      io.disconnect();
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up);
      host.removeEventListener('pointercancel', up);
      host.removeEventListener('pointerleave', up);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(prog);
    }
  };
}

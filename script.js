const canvas = document.getElementById("display");
const w = window.innerWidth,
  h = window.innerHeight;
canvas.width = w, canvas.height = w; // have to do this b4 gl exists

const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });

var shaderEnv = {
  // define a string to be replaced in shader
  "frameSplits": frameSplits,
  "rand": Math.random(),
  "sphereLength": spheres.length,
  "triangleLength": triangles.length,
  "samples": Math.floor(samples / frameSplits),
  "bounces": Math.floor(bounces),
  "antialiasScale": antiAliasScale,
  "antiSelfIntersectScale": 0.02
}, program, frameCount = 0;

var fullQuad = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
var quads = [];
// var verticalScreenSplits = 128;
// var horizontalScreenSplits = 128;
// var verticalScreenSplits = splits;
var verticalScreenSplits = 2;
var horizontalScreenSplits = 4;
// var horizontalScreenSplits = 1;
const lerp = (a, b, t) => t * a + (1 - t) * b;

function logRenderSettings() {
  console.log({
    samples,
    frameSplits,
    bounces
  })
}

async function init() {
  logRenderSettings();
  
  let xOff = 1 / horizontalScreenSplits, yOff = 1 / verticalScreenSplits;
  
  for (let i = 0; i < horizontalScreenSplits; i++)
    for (let j = 0; j < verticalScreenSplits; j++) {
      let x = i / horizontalScreenSplits, y = j / verticalScreenSplits;
      quads.push([
        ...[lerp(-1, 1, x), lerp(-1, 1, y)],
        ...[lerp(-1, 1, x + xOff), lerp(-1, 1, y)],
        ...[lerp(-1, 1, x + xOff), lerp(-1, 1, y + yOff)],
        ...[lerp(-1, 1, x), lerp(-1, 1, y + yOff)],
      ]);
    }

  console.time(`Render Prep`);
  console.group("Render Prep");

  console.group("Shader Prep");

  console.group("Frag Shader");
  var fragShader = await loadShader("fragShader", shaderEnv);
  console.groupEnd();
  
  console.group("Vert Shader");
  var vertShader = await loadShader("vertShader", shaderEnv);
  console.groupEnd();
  
  console.groupEnd();

  program = await createProgram(fragShader, vertShader);
  gl.useProgram(program);

  console.time(`Render Settings`);

  program.shaders = { frag: fragShader, vert: vertShader };

  // default blending
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.blendEquation(gl.FUNC_ADD);
  gl.colorMask(true, true, true, true);

  // set the vec2 "screenSize" to (w, h)
  setUniform("screenSize", "2fv", new Float32Array([w, h]));

  setUniform("cameraPos", "3fv", new Float32Array(camera.position));
  setUniform("focalLength", "1f", camera.focalLength);

  for (let i = 0; i < spheres.length; i++) {
    setUniform(`spheres[${i}].pos`, "3fv", new Float32Array(spheres[i].position));
    setUniform(`spheres[${i}].rad`, "1f", spheres[i].radius);
    setUniform(`spheres[${i}].mat.rof`, "1f", spheres[i].roughness);
    setUniform(`spheres[${i}].mat.col`, "3fv", new Float32Array(spheres[i].color));
    setUniform(`spheres[${i}].mat.lum`, "3fv", new Float32Array(spheres[i].luminous));
  }

  for (let i = 0; i < triangles.length; i++) {
    setUniform(`triangles[${i}].a`, "3fv", new Float32Array(triangles[i].a));
    setUniform(`triangles[${i}].b`, "3fv", new Float32Array(triangles[i].b));
    setUniform(`triangles[${i}].c`, "3fv", new Float32Array(triangles[i].c));
    setUniform(`triangles[${i}].mat.col`, "3fv", new Float32Array(triangles[i].color));
    setUniform(`triangles[${i}].mat.lum`, "3fv", new Float32Array(triangles[i].luminous));
    setUniform(`triangles[${i}].mat.rof`, "1f", triangles[i].roughness);
  }

  console.timeEnd(`Render Settings`);

  console.groupEnd();
  console.timeEnd(`Render Prep`);


  console.time(`Render Process`);
  console.group("Render Process");

  await renderScene();
}

// blocks gui inputs and stuff
// async function renderScene() {
//   if (frameCount >= quads.length) return;
  
//   for (let i = 0; i < frameSplits; i++) {
//     render(frameCount);
//     await sleep();
//   }
  
//   frameCount ++;
//   requestAnimationFrame(renderScene);
// }


async function renderScene() {
  if (frameCount >= frameSplits * quads.length) {
    console.groupEnd();
    console.timeEnd(`Render Process`);
    console.timeEnd("Full Process");
    logRenderSettings();
    return;
  }

  render(frameCount % quads.length);
  // sleep();

  // antiAliasScale *= 0.9;
  // if (antiAliasScale <= 0.1) return;

  frameCount ++;

  requestAnimationFrame(renderScene);
  // renderScene();
  // setTimeout(renderScene, 0);
}

function sleep(ms = 1){
  return new Promise((res) => setTimeout(res, ms));
}

function render(quadIndex){
  console.time(`Render Frame`);

  drawQuad(quadIndex);
  let randArr = new Array(shaderEnv.samples).fill(0).map(v => Math.random());
  setUniform("frames", "1f", frameCount);
  setUniform("time", "1f", performance.now());
  setUniform("randN", "1fv", new Float32Array(randArr));
  setUniform("AAS", "1f", antiAliasScale);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

  console.timeEnd(`Render Frame`);
}

function setUniform(uniform, type, val){
  gl[`uniform${type}`](gl.getUniformLocation(program, uniform), val);
}

function drawQuad(index = 0) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = new Float32Array(quads[index]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const positionLocation = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
}

async function createProgram(fragShader, vertShader) {
  console.group("Program Creation");
  console.log("Creating program...");
  console.time(`Program Created`);
  program = gl.createProgram();
  if (!program) return console.log("Program didn't create. Try again?");

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);

  gl.linkProgram(program);

  // if (not linked)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('LINK ERROR:' + gl.getProgramInfoLog(program));
    gl.deleteShader(fragShader);
    gl.deleteShader(vertShader);
    return gl.deleteProgram(program);
  }

  console.timeEnd(`Program Created`);
  console.groupEnd();

  return program;
}

// element id => compiled shader ready for use
async function loadShader(id, env) {
  console.log(`Loading shader... (ID: ${id})`)
  console.time(`Shader Loaded (${id})`);
  var isFrag = id.startsWith("f");
  var type = isFrag ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;
  var src = await load(id, env);
  var shader = gl.createShader(type);

  gl.shaderSource(shader, src);

  console.time("Shader Compilation");

  gl.compileShader(shader);

  console.timeEnd("Shader Compilation");


  // if (not compiled)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log((isFrag ? "FRAG " : "VERT ") + gl.getShaderInfoLog(shader));
    return gl.deleteShader(shader);
  }

  shader.src = src;

  console.timeEnd(`Shader Loaded (${id})`);
  return shader;
}

async function load(id, env = {}) {
  
  var el = document.getElementById(id);
  var resp = await (await fetch(el.src)).arrayBuffer();
  var intArr = new Int8Array(resp);
  var stringSrc = "";

  intArr.forEach(int => stringSrc += String.fromCharCode(int));
  
  var envPos = [];

  for(let i = 0; i < stringSrc.length; i++)
    if(stringSrc[i] == "$") envPos.push(i);

  if(!envPos.length) return stringSrc;


  var finSrcArr = [];

  finSrcArr.push(stringSrc.substring(0, envPos[0]));

  for(let i = 0; i < envPos.length; i += 2){
    var pos = envPos[i];
    var keyStr = stringSrc.substring(pos + 1).split("$").shift();
    var key = keyStr.split(".");
    var value = env;
    for(let j = 0; j < key.length; j++){
      value = value[key[j]];
    }
    if(typeof value == undefined) value = "";
    finSrcArr.push(value);
    if(i + 1 < envPos.length) finSrcArr.push(stringSrc.substring(envPos[i + 1] + 1, envPos[i + 2]));
  }

  var finSrc = finSrcArr.join("");
  
  return finSrc;
}

(async () => {
  console.time("Full Process");
  await init();
})();

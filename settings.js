// per pixel
const samples = 500;
const frameSplits = 10; // how many frames to split up the samples on
let antiAliasScale = 0.0;
// how many times light can bounce (on deez n- oh mb)
const bounces = 4;

let wallRoughness = 0.7;
let wallRadius = 50; // using small parts of large spheres makes the curvature difficult to spot, imitating a wall
let sceneWidth = 10;

const scene = [
  { // far side (white)
    type: "sphere",
    position: [0, 0, wallRadius + 15],
    radius: wallRadius,
    color: [0.8, 0.8, 0.1],
    luminous: [0, 0, 0],
    roughness: wallRoughness
  },
  { // close side (black)
    type: "sphere",
    position: [0, 0, -(wallRadius + 25)],
    radius: wallRadius,
    color: [0.1, 0.1, 0.8],
    luminous: [0, 0, 0],
    roughness: wallRoughness
  },
  { // top side (white)
    type: "sphere",
    position: [0, wallRadius + 5, 0],
    radius: wallRadius,
    color: [0.8, 0.8, 0.8],
    luminous: [0.6, 0.6, 0.6],
    roughness: wallRoughness
  },
  { // bottom side (white)
    type: "sphere",
    position: [0, -(wallRadius + 5), 0],
    radius: wallRadius,
    color: [0.8, 0.8, 0.8],
    luminous: [0, 0, 0],
    roughness: wallRoughness
  },
  { // left side (red)
    type: "sphere",
    position: [-(wallRadius + sceneWidth), 0, 0],
    radius: wallRadius,
    color: [0.8, 0.1, 0.1],
    luminous: [0, 0, 0],
    roughness: wallRoughness
  },
  { // right side (green)
    type: "sphere",
    position: [wallRadius + sceneWidth, 0, 0],
    radius: wallRadius,
    color: [0.1, 0.8, 0.1],
    luminous: [0, 0, 0],
    roughness: wallRoughness
  },
  // ...[ // reflecty, matte, and glowy
  //   { // reflecty ball (white but visibly white)
        // type: "sphere",
  //     position: [-3, -3, -2],
  //     radius: 2,
  //     color: [1, 1, 1],
  //     luminous: [0, 0, 0],
  //     roughness: 0
  //   },
    
  //   { // matte ball (idk?)
        // type: "sphere",
  //     position: [2, -2, 2],
  //     radius: 3,
  //     color: [0.7, 0.7, 0.7],
  //     luminous: [0, 0, 0],
  //     roughness: .8
  //   },

  //   { // glowy ball (glo)
        // type: "sphere",
  //     position: [-2, 3, 4],
  //     radius: 1,
  //     color: [0.8, 0.8, 0.8],
  //     luminous: [1, 1, 1],
  //     roughness: .8
  //   },
  // ]
  // {
  //   type: "triangle",
  //   a: [-15, -15, 15],
  //   b: [-15, 15, 15],
  //   c: [15, 15, 15],
  //   color: [1, .5, 1],
  //   luminous: [0, 0, 0],
  //   roughness: 0
  // },
  // {
  //   type: "triangle",
  //   a: [-15, -15, 15],
  //   b: [15, -15, 15],
  //   c: [15, 15, 15],
  //   color: [1, .5, 1],
  //   luminous: [0, 0, 0],
  //   roughness: 0
  // },
  { // reflecty ball (white but visibly white)
    type: "sphere",
    position: [-5, -3, -5],
    radius: 2,
    color: [1, 1, 1],
    luminous: [0, 0, 0],
    roughness: 0
  },
  { // glowy ball (white but visibly white)
    type: "sphere",
    position: [5, -2, 0],
    radius: 1,
    color: [1, 1, 1],
    luminous: [1, 1, 1].map(v => v * 10),
    roughness: 0
  }
];

const spheres = scene.filter((v) => v.type == "sphere");
const triangles = scene.filter((v) => v.type == "triangle");

const camera = {
  position: [0, 0, -20],
  focalLength: 1.0
};

// if (spheres.length == 0) spheres.push({
  
// });


if (triangles.length == 0) triangles.push({
  type: "triangle",
  a: [0, 0, 0],
  b: [0.1, 0.1, 0],
  c: [0, 0, 0],
  color: [1, .5, 1],
  luminous: [0, 0, 0],
  roughness: 0
});

#version 300 es

precision highp float;
precision highp int;

#define PI 3.141592653
#define D_TO_R 0.0174533
#define PHI 1.61803398874989484820459

struct Ray {
  vec3 pos;
  vec3 dir;
};

struct Material {
  vec3 col;
  vec3 lum;
  float rof;
};

struct Triangle {
  vec3 a;
  vec3 b;
  vec3 c;
  Material mat;
};

struct Sphere {
  vec3 pos;
  float rad;
  Material mat;
};

struct Intersection {
  Material mat;
  vec3 point;
  vec3 normal;
  float dist;
  bool valid;
};

in vec2 pos;
in vec2 pxPos;
uniform vec2 screenSize;
uniform vec3 cameraPos;
uniform float focalLength;
uniform float time;
uniform float frameCount;
uniform float randN[$samples$];
uniform float AAS;
uniform Sphere spheres[$sphereLength$];
uniform Triangle triangles[$triangleLength$];
out vec4 fragColor;

uint seed = 0u;

uint pcg(uint v) {
  uint hash = 4u, tmp;

  hash += v & 0xffffu;
  tmp = (((v >> 16) & 0xffffu) << 11) ^ hash;
  hash = (hash << 16) ^ tmp;
  hash += hash >> 11;

  hash ^= hash << 3;
  hash += hash >> 5;
  hash ^= hash << 4;
  hash += hash >> 17;
  hash ^= hash << 25;
  hash += hash >> 6;

  return hash;
}

uint prepPRNG(float num) {
  seed = pcg(pcg(19u * uint(pxPos.x) + 47u * uint(pxPos.y) + 102u) + pcg(uint(num * 4294967295.0)));
  // seed = pcg(pcg(uint(pxPos.x) ^ uint(pxPos.y)) + pcg(uint(pxPos.y) + uint(pxPos.x)) + uint(randN * 4294967295.0));
  // seed = pcg(pcg(uint(pxPos.x) ^ uint(pxPos.y)) + pcg(uint(pxPos.y) + uint(pxPos.x)) + uint($rand$ * 4294967295.0));
  return seed;
}

float rand() {
  seed = pcg(seed);
  return float(seed) / 4294967295.0;
}

vec3 lerp(vec3 a, vec3 b, float t){
  return (1.0 - t) * b + a * t;
}

vec3 randomDirection(){
  return normalize(vec3(rand(), rand(), rand()) - .5);
}

Ray reflectRay(Ray ray, Intersection intersection){
  vec3 normal = intersection.normal;

  // randomizing normal to apply roughness
  float ang = rand();
  normal = normalize(lerp(randomDirection(), normal, intersection.mat.rof));
  
  float mag = dot(ray.dir, normal) * 2.0;
  vec3 newDir = normalize(ray.dir - (normal * mag));
  
  // randomizing new dir to apply roughness
  // newDir = normalize(lerp(randomDirection(), newDir, intersection.mat.rof));
  // newDir = normalize(randomDirection() * intersection.mat.rof + newDir);
  
  return Ray(intersection.point, newDir);
}

Intersection SphereIntersection (Sphere obj, Ray ray) {
  Intersection intersection;
  intersection.mat = obj.mat;
  intersection.valid = false;

  vec3 diff = ray.pos - obj.pos;

  float a = dot(ray.dir, ray.dir);
  float b = 2.0 * dot(diff, ray.dir);
  float c = dot(diff, diff) - obj.rad * obj.rad;
  float d = b * b - 4.0 * a * c;

  if (d >= 0.0) {
    float t = (-b - sqrt(d)) / (2.0 * a);

    if (t >= 0.0) {
      intersection.dist = t;
      intersection.valid = true;
      intersection.point = ray.pos + ray.dir * t;
      intersection.normal = normalize(intersection.point - obj.pos);
    }
  }
  
  return intersection;
}

float PointInOrOn(vec3 P1, vec3 P2, vec3 A, vec3 B){ return step(0.0, dot(cross(B - A, P1 - A), cross(B - A, P2 - A))); }
bool PointInTriangle(vec3 px, vec3 p0, vec3 p1, vec3 p2){ return (PointInOrOn(px, p0, p1, p2) * PointInOrOn(px, p1, p2, p0) * PointInOrOn(px, p2, p0, p1)) > .0; }

Intersection TriangleIntersection(Triangle triangle, Ray ray) {
  Intersection intersection;
  intersection.mat = triangle.mat;
  intersection.valid = false;

  vec3 D = ray.dir;
  vec3 N = cross(triangle.b - triangle.a, triangle.c - triangle.a);
  vec3 X = ray.pos + D * dot(triangle.a - ray.pos, N) / dot(D, N);
  
  bool valid = PointInTriangle(X, triangle.a, triangle.b, triangle.c);

  if (!valid) return intersection;

  intersection.point = X;
  intersection.valid = true;
  intersection.dist = distance(X, ray.pos);
  
  vec3 a = triangle.b - triangle.a;
  vec3 b = triangle.c - triangle.a;

  intersection.normal = N;

  return intersection;
}

Intersection ClosestSphereIntersection(Ray ray) {
  Intersection closest;
  closest.valid = false;
  
  for (int i = 0; i < $sphereLength$; i++) {
    Intersection current = SphereIntersection(spheres[i], ray);

    if (!current.valid) continue;

    if (current.dist < closest.dist || !closest.valid) {
      closest = current;
    }
  }

  return closest;
}

Intersection ClosestTriangleIntersection(Ray ray) {
  Intersection closest;
  closest.valid = false;
  
  for (int i = 0; i < $triangleLength$; i++) {
    Intersection current = TriangleIntersection(triangles[i], ray);

    if (!current.valid) continue;
    
    if (current.dist < closest.dist || !closest.valid)
      closest = current;
  }

  return closest;
}

Intersection ClosestIntersection(Ray ray) {
  Intersection closestTriangle = ClosestTriangleIntersection(ray);
  Intersection closestSphere = ClosestSphereIntersection(ray);

  if (closestTriangle.valid && closestTriangle.dist < closestSphere.dist) 
    return closestTriangle;
  return closestSphere;
}

vec3 SampleLightRay(Ray ray, int index) {
  prepPRNG(randN[index]);
  
  Ray viewRay = ray;
  viewRay.dir = normalize(ray.dir + randomDirection() * AAS);

  Intersection last;
  vec3 light = vec3(0.0, 0.0, 0.0);
  vec3 color = vec3(1.0, 1.0, 1.0);

  for (int i = 0; i < $bounces$; i++) {
    // note: closest intersection function adds triangles
    // I disabled it for perf (Im bad at perf but commenting out code is easy)
    // Intersection current = ClosestIntersection(viewRay);
    Intersection current = ClosestSphereIntersection(viewRay);

    if (!current.valid) break;
    
    viewRay = reflectRay(viewRay, current);
    light += current.mat.lum * color;
    color *= current.mat.col;
    last = current;
  }

  return light;
}

void main() {
  vec2 aspectRatio = vec2(1.0, screenSize.y / screenSize.x);
  vec3 dir = normalize(vec3((pos - 0.5) * PI * aspectRatio * 0.5, focalLength));
  Ray viewRay = Ray(cameraPos, dir);

  vec3 averageColor = vec3(0.0, 0.0, 0.0);

  for (int i = 0; i < $samples$; i++)
    averageColor += SampleLightRay(viewRay, i);

  fragColor = vec4(
    averageColor / ($samples$.0 * $frameSplits$.0), 1.0
  );
}

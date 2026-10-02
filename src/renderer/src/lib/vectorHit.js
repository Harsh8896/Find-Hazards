// Tap detection for "vector" scenes (see data/scenes.js) — hazards there are hand-traced
// polygons in source-image pixel coordinates, tinted with CSS/SVG, instead of a scene-labels.png
// pixel map + baked cut-out PNGs. No image is generated for these scenes.

// Standard ray-casting point-in-polygon test.
function pointInPolygon(x, y, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

// What did a tap at (fx, fy) — fractions of the scene's width/height — land on?
export function hitTestVector(scene, fx, fy) {
  const x = fx * scene.imageWidth
  const y = fy * scene.imageHeight
  return scene.vectorObjects.find((o) => pointInPolygon(x, y, o.points)) || null
}

export const vectorIdForKey = (scene, key) => scene.vectorObjects.find((o) => o.key === key)?.id

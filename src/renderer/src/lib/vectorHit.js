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
function distanceToPolygonSquared(x, y, points) {
  let closest = Infinity
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]
    const [bx, by] = points[(i + 1) % points.length]
    const dx = bx - ax
    const dy = by - ay
    const lengthSquared = dx * dx + dy * dy
    const t = lengthSquared ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared)) : 0
    const px = ax + t * dx
    const py = ay + t * dy
    const distanceSquared = (x - px) ** 2 + (y - py) ** 2
    if (distanceSquared < closest) closest = distanceSquared
  }
  return closest
}

export function hitTestVector(scene, fx, fy, tolerancePx = 0) {
  const x = fx * scene.imageWidth
  const y = fy * scene.imageHeight
  const inside = scene.vectorObjects.find((o) => pointInPolygon(x, y, o.points))
  if (inside || tolerancePx <= 0) return inside || null

  let closest = null
  let closestDistanceSquared = 0
  for (const object of scene.vectorObjects) {
    const distanceSquared = distanceToPolygonSquared(x, y, object.points)
    const objectTolerance = Math.max(tolerancePx, object.hitPaddingPx || 0)
    if (distanceSquared <= objectTolerance * objectTolerance && (!closest || distanceSquared < closestDistanceSquared)) {
      closest = object
      closestDistanceSquared = distanceSquared
    }
  }
  return closest
}

export const vectorIdForKey = (scene, key) => scene.vectorObjects.find((o) => o.key === key)?.id

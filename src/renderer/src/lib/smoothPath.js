// Turns a hand-traced closed polygon into a smooth closed curve (Catmull-Rom -> cubic Bezier),
// so vector-scene highlights hug a worker's silhouette instead of showing straight polygon edges.
export function smoothClosedPath(points) {
  const n = points.length
  if (n < 3) return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z'

  const at = (i) => points[(i + n) % n]
  let d = `M${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < n; i++) {
    const [p0x, p0y] = at(i - 1)
    const [p1x, p1y] = at(i)
    const [p2x, p2y] = at(i + 1)
    const [p3x, p3y] = at(i + 2)
    const c1x = p1x + (p2x - p0x) / 6
    const c1y = p1y + (p2y - p0y) / 6
    const c2x = p2x - (p3x - p1x) / 6
    const c2y = p2y - (p3y - p1y) / 6
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2x} ${p2y}`
  }
  return d + ' Z'
}

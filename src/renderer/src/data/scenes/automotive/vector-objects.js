// Hazard hit-shapes for the automotive scene, as real polygons (not bounding boxes) traced from
// the worker/object silhouette in Automotive.svg (1448x813 source pixels — the marketing
// header/footer baked into the original poster art was cropped off, see project memory). Each
// polygon is both the click target and the exact outline CSS tints on tap — see VectorHighlight
// in GameScreen.jsx. Traced via GrabCut segmentation of the source image, one hazard at a time;
// only hazard 1 exists so far (see hazards.js).
export const VECTOR_OBJECTS = [
  {
    id: 1,
    key: 'height-worker-automotive',
    kind: 'hazard',
    // the worker on the mobile scaffold platform, reaching up to the overhead rail
    points: [
      [232, 19],
      [223, 24],
      [214, 35],
      [207, 37],
      [204, 40],
      [204, 63],
      [207, 73],
      [204, 84],
      [205, 92],
      [210, 96],
      [210, 110],
      [212, 113],
      [208, 134],
      [208, 141],
      [210, 144],
      [208, 146],
      [207, 167],
      [227, 177],
      [228, 186],
      [241, 188],
      [245, 185],
      [245, 178],
      [242, 175],
      [244, 105],
      [246, 99],
      [262, 76],
      [261, 69],
      [256, 63],
      [265, 56],
      [270, 49],
      [259, 41],
      [254, 41],
      [252, 39],
      [251, 34],
      [253, 29],
      [251, 26],
      [239, 24],
      [235, 19]
    ]
  }
]

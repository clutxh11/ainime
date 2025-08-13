export interface Point {
  x: number;
  y: number;
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (
      polygon[i].y > point.y !== polygon[j].y > point.y &&
      point.x <
        ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) /
          (polygon[j].y - polygon[i].y) +
          polygon[i].x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function getStrokesBoundingBox(strokes: { points: Point[] }[]) {
  if (strokes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  strokes.forEach((stroke) => {
    stroke.points.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
  });
  return { minX, maxX, minY, maxY };
}

export function getResizeHandles(box: any) {
  if (!box) return {} as any;
  const handleSize = 8;
  const { x, y, width, height } = box;
  return {
    topLeft: {
      x: x - handleSize / 2,
      y: y - handleSize / 2,
      size: handleSize,
      cursor: "nwse-resize",
    },
    topRight: {
      x: x + width - handleSize / 2,
      y: y - handleSize / 2,
      size: handleSize,
      cursor: "nesw-resize",
    },
    bottomLeft: {
      x: x - handleSize / 2,
      y: y + height - handleSize / 2,
      size: handleSize,
      cursor: "nesw-resize",
    },
    bottomRight: {
      x: x + width - handleSize / 2,
      y: y + height - handleSize / 2,
      size: handleSize,
      cursor: "nwse-resize",
    },
  } as const;
}

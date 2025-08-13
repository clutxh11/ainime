export interface Point {
  x: number;
  y: number;
}
export interface DrawingStroke {
  id: string;
  color: string;
  brushSize: number;
  points: Point[];
}

export default function useSelectionTools() {
  const [lassoSelection, setLassoSelection] = useState<{
    points: Point[];
    selectedStrokeIds: string[];
    isActive: boolean;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [originalLassoPoints, setOriginalLassoPoints] = useState<Point[]>([]);
  const [originalStrokePositions, setOriginalStrokePositions] = useState<
    Record<string, { points: Point[] }>
  >({});

  const mousePosRef = useRef<Point>({ x: 0, y: 0 });

  return {
    lassoSelection,
    setLassoSelection,
    isSelecting,
    setIsSelecting,
    isDragging,
    setIsDragging,
    dragOffset,
    setDragOffset,
    originalLassoPoints,
    setOriginalLassoPoints,
    originalStrokePositions,
    setOriginalStrokePositions,
    mousePosRef,
  } as const;
}

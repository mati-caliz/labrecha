export function assumeJsonShape<Shape>(payload: unknown): Shape {
  return payload as Shape;
}

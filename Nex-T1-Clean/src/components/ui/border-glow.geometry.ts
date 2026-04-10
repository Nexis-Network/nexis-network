export function getElementCenter(element: HTMLElement): [number, number] {
  const { width, height } = element.getBoundingClientRect();

  return [width / 2, height / 2];
}

export function getEdgeProximity(
  element: HTMLElement,
  x: number,
  y: number,
): number {
  const [centerX, centerY] = getElementCenter(element);
  const deltaX = x - centerX;
  const deltaY = y - centerY;
  let horizontalScale = Number.POSITIVE_INFINITY;
  let verticalScale = Number.POSITIVE_INFINITY;

  if (deltaX !== 0) {
    horizontalScale = centerX / Math.abs(deltaX);
  }

  if (deltaY !== 0) {
    verticalScale = centerY / Math.abs(deltaY);
  }

  return Math.min(Math.max(1 / Math.min(horizontalScale, verticalScale), 0), 1);
}

export function getCursorAngle(
  element: HTMLElement,
  x: number,
  y: number,
): number {
  const [centerX, centerY] = getElementCenter(element);
  const deltaX = x - centerX;
  const deltaY = y - centerY;

  if (deltaX === 0 && deltaY === 0) {
    return 0;
  }

  const radians = Math.atan2(deltaY, deltaX);
  const angle = radians * (180 / Math.PI) + 90;

  return angle < 0 ? angle + 360 : angle;
}

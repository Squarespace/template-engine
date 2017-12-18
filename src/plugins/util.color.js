
export const hexColorToInt = hex => {
  if (hex[0] === '#') {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    return parseInt(hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2], 16);
  }
  if (hex.length === 6) {
    return parseInt(hex, 16);
  }
  return -1;
};

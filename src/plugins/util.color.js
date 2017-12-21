
const VALID_COLOR = /^[abcdef0-9]{3,6}$/i;

export const hexColorToInt = hex => {
  if (hex[0] === '#') {
    hex = hex.slice(1);
  }
  if (VALID_COLOR.test(hex)) {
    if (hex.length === 3) {
      return parseInt(hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2], 16);
    }
    return parseInt(hex, 16);
  }
  return -1;
};

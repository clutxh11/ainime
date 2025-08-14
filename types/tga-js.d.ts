declare module 'tga-js' {
  export default class TGA {
    constructor(buffer: ArrayBuffer);
    getImageData(): {
      width: number;
      height: number;
      data: Uint8ClampedArray;
    };
  }
}

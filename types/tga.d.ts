declare module 'tga' {
  export default class TGA {
    width: number;
    height: number;
    pixels: Uint8Array;
    
    constructor(buffer: ArrayBuffer);
  }
}

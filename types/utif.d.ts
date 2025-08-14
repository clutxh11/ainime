declare module 'utif' {
  export interface IFD {
    width: number;
    height: number;
    data: ArrayBuffer;
    [key: string]: any;
  }

  export function decode(buffer: Uint8Array): IFD[];
  export function decodeImage(buffer: Uint8Array, ifd: IFD): void;
}

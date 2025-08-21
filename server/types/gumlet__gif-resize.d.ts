declare module '@gumlet/gif-resize' {
    interface GifResizeOptions {
        width?: number;
        height?: number;
        stretch?: boolean;
        crop?: number[];
    }
    function gifResize(options: GifResizeOptions): ( buffer: Buffer ) => Promise<Buffer>;
    export default gifResize;
}

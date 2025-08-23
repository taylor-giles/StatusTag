declare module '@gumlet/gif-resize' {
    interface GifResizeOptions {
        width?: number;
        height?: number;
        stretch?: boolean;
        crop?: number[];
    }
    function gifResize(options: GifResizeOptions): ( buffer: any ) => Promise<any>;
    export = gifResize;
}

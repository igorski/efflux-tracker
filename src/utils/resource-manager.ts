// create a singular interface to create and revoke Blob URLs
// this makes it easier to backtrack the source of lingering Objects
// for debugging and spotting memory leaks, in Chrome you can access chrome://blob-internals/
// to view all allocated object URLs

export const blobToResource = ( blob: Blob ): string => {
    const blobUrl = window.URL.createObjectURL( blob );
    // console.info( `Registed URI "${blobUrl}"` );
    return blobUrl;
};
export const disposeResource = ( blobURL: string ): void => window.URL.revokeObjectURL( blobURL );

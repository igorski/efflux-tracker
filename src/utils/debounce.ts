/**
 * Blatantly stolen from https://stackoverflow.com/a/61241621
 */
export function debounce( callback: Function, delay: number, immediate = false ): Function {
    let timeout: ReturnType<typeof setTimeout> | null;
    return function(): void {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if ( !immediate ) {
                callback.apply( context, args );
            }
        };
        const callNow = immediate && !timeout;
        clearTimeout( timeout! );
        timeout = setTimeout( later, delay );
        if ( callNow ) {
            callback.apply( context, args );
        }
    };
};
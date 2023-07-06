/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { compressUTF16, decompressUTF16 } from "@/services/compression-service";

let storage: Storage;

const StorageUtil =
{
    /**
     * initializes the storage mechanism
     */
    init(): void {
        // use LocalStorage
        storage = window.localStorage;
    },
    /**
     * verifies whether storage is available
     */
    isAvailable(): boolean {
        return typeof storage !== "undefined";
    },
    /**
     * get an item from storage
     */
    getItem( key: string ): Promise<string> {
        return new Promise( async ( resolve, reject ) => {
            if ( !StorageUtil.isAvailable() ) {
                reject( Error( "Storage not available" ));
            }
            const data = storage.getItem( key );
            if ( data ) {
                resolve( await decompress( data ));
            } else {
                reject( Error( `Data for "${key}" not found"` ));
            }
        });
    },
    /**
     * set an item in storage
     */
    setItem( key: string, data: any ): Promise<void> {
        return new Promise( async ( resolve, reject ) => {
            if ( !StorageUtil.isAvailable() ) {
                reject( Error( "Storage not available" ));
            }
            try {
                const compressedData = await compress( data );
                storage.setItem( key, compressedData );
                resolve();
            } catch ( e ) {
                const quotaExceeded = e instanceof DOMException;
                reject( new Error( quotaExceeded ? "QUOTA" : "UNKNOWN" ));
            }
        });
    },
    /**
     * removes an item from storage
     */
    removeItem( key: string ): Promise<void> {
        return new Promise(( resolve, reject ) => {
            if ( !StorageUtil.isAvailable() ) {
                reject( Error( "Storage not available" ));
            }
            resolve( storage.removeItem( key ));
        });
    },
    /**
     * returns the local storage keys matching optional prefix and their size in kilobytes
     */
    getItemSizes( optPrefix: string = "" ): Record<string, string> {
        const out = {} as Record<string, string>;
        for ( const name in localStorage ) {
            if ( !name.startsWith( optPrefix ) || !Object.prototype.hasOwnProperty.call( localStorage, name )) {
                continue;
            }
            const size = (( localStorage[ name ].length + name.length) * 2 );
            out[ name ] = `${( size / 1024 ).toFixed( 2 )} Kb`;
        }
        return out;
    }
};
export default StorageUtil;

/* internal methods */

// by compressing the stringified Objects we can maximize
// the amount data we can save in the applications quota in LocalStorage

async function compress( string: string ): Promise<string> {
    let compressedString;
    try {
        compressedString = await compressUTF16( string );
    } catch ( e ) {
        return string;
    }
    // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
    if ( import.meta.env.MODE !== "production" ) {
        console.log(
            "Compressed " + string.length + " to " + compressedString.length + " (" +
            (( compressedString.length / string.length ) * 100 ).toFixed( 2 ) + "% of original size)"
        );
    }
    return compressedString;
}

async function decompress( string: string ): Promise<string> {
    let decompressedString;

    try {
        decompressedString = await decompressUTF16( string );
    } catch ( e ) {
        return string;
    }

    // shorter length implies that given string could not be decompressed
    // properly, meaning it was likely not compressed in the first place

    if ( !decompressedString || decompressedString.length < string.length ) {
        return string;
    }
    return decompressedString;
}

/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
import axios from "axios";

type Fixtures = Record<string, any>;

export default
{
    /**
     * convenience method to retrieve demo songs via
     * Ajax, this overcomes the need to package them along
     * with the main application script
     */
    load( filename: string ): Promise<any[]> {
        return new Promise(( resolve, reject ): void => {
            axios.get( `${getBasePath()}fixtures/${filename}` )
                .then(({ data }: { data: Fixtures }) => {
                    if ( data ) {
                        // Fixtures are bundled in an map, convert to list
                        resolve(
                            Object.keys( data ).reduce(( acc, key ) => {
                                acc.push( data[ key ]);
                                return acc;
                            }, [])
                        );
                    }
                })
                .catch(( e: Error ) => reject( `could not load fixture due to "${e.message}" ` ));
        });
    }
};

/* internal methods */

/**
 * return the path that Efflux is running in, this can
 * differ dependent on the production environment
 */
function getBasePath(): string {
    // @ts-expect-error Property 'effluxPath' does not exist on type 'Window & typeof globalThis'.
    return ( typeof window.effluxPath === "string" ) ? window.effluxPath : window.location.origin + window.location.pathname;
}

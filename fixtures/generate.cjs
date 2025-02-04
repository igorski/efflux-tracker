const fs = require( "fs" );

const currentDir    = __dirname;
const outputDir     = `${process.cwd()}/public/fixtures`; // invoke from repository root
const instrumentDir = `${currentDir}/instruments`;
const songDir       = `${currentDir}/songs`;

function mergeFiles( inputDir, outputFilename ) {
    const jsonArray = fs.readdirSync( inputDir ).reduce(( acc, file ) => {
        const [ name, ext ] = file.split( "." );
        if ( ext !== "json" ) {
            return acc;
        }
        try {
            const data = fs.readFileSync( `${inputDir}/${file}`, "utf8" );
            acc.push( JSON.parse( data ));
        } catch ( e ) {
            console.error( `Error "${e?.message}" occurred for file "${file}"` );
            return acc;
        }
        return acc;
    }, []);

    if ( !fs.existsSync( outputDir )) {
        fs.mkdirSync( outputDir, { recursive: true });
    }

    fs.writeFileSync( `${outputDir}/${outputFilename}`, JSON.stringify( jsonArray ));
}

mergeFiles( instrumentDir, "fixtures-instruments.json" );
mergeFiles( songDir, "fixtures-songs.json" );

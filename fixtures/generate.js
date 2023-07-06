const fs = require( "fs" );

const currentDir    = __dirname;
const outputDir     = `${process.cwd()}/public/fixtures`; // invoke from repository root
const instrumentDir = `${currentDir}/instruments`;
const songDir       = `${currentDir}/songs`;

function mergeFiles( directory, outputFilename ) {
    const jsonArray = fs.readdirSync( directory ).reduce(( acc, file ) => {
        const data = fs.readFileSync( `${directory}/${file}`, "utf8" );
        acc.push( JSON.parse( data ));
        return acc;
    }, []);

    fs.writeFileSync( outputFilename, JSON.stringify( jsonArray ));
}

mergeFiles( instrumentDir, `${outputDir}/fixtures-instruments.json` );
mergeFiles( songDir, `${outputDir}/fixtures-songs.json` );

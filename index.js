/**
 * This Package allows to specify a Cypress Test folder as input and to run the test
 * in a loop fashion a certain number of times, meanwhile watching the `screenShotsFolder`
 * for changes and copying it into a specified Destination Folder
 * * Supposing that the `trashAssetsBeforeRuns` has its default value
 */
'use strict';

const { existsSync, lstatSync, readdirSync } = require('fs');
const { inspect } = require('util');
const { resolve, parse, join } = require('path');
const chalk = require('chalk');

//-----------------------------------------------------------------------------------------------------------
const log = console.log.bind(console);
const info = chalk.bold.blue;
const warning = chalk.bold.yellow;
const error = chalk.bold.red;


/**
 * First Parameter is the project Folder where cypress has been added `src`
 * that might contain a cypress.json and must contain a package.json file 
 * * cypress works without cypress.json 
 */
const argv = require('yargs')
    .option('src', {
        alias: 's',
        describe: 'The Project directory where Cypress was added',
        demandOption: true
    })
    .option('dest', {
        alias: 'd',
        describe: 'The Destination directory where to copy the Screenshots on Test Error',
        demandOption: true
    })
    .option('number-of-test-exec', {
        alias: 'n',
        describe: 'The number of time the Tests should be run before stopping',
        demandOption: true
    })
    .version()
    .help()
    .argv;



const [ srcPath , destPath ] = [ resolve(argv.src), resolve(argv.dest) ];
if( existsSync( srcPath) && existsSync( destPath )) {
    if( checkDirectories( [ srcPath , destPath ] )) {
        log(info(`The Src Dir Path is ${ srcPath } and the dest Dir path is ${ destPath}`));
        let cypressFolderPath = isSrcPathValid( srcPath );
        if( !cypressFolderPath ) {
            process.exit( 1 );
        }else {
            if( existsSync( cypressFolderPath )) {
                log(info(`The Cypress Folder ${cypressFolderPath} exists in the file System `));

            }
        }
    }else{
        log(error(`${chalk.underline('src')} and ${chalk.underline('dest')} arguments must be directories`));
        process.exit( 1 );
    }
}


//-----------------------------------------------------------------------------------------------------------

function getCypressScriptsFromPackageJson() {
    
}

function isSrcPathValid( pathToFolder ) {
    //Cypress Folder contain a package.json and/or cypress.json
    let srcDirContent = readdirSync( pathToFolder );
    const localUtil = function ( dirContent ) {
        let parsed = parse( dirContent );
        return (( parsed.name.toLowerCase() === 'cypress') && ( !parsed.ext))
    }

    if( Array.prototype.some.call( srcDirContent, localUtil)) {
        log(info(`${ pathToFolder } is a valid Src folder containing the Cypress folder`));
        return join( pathToFolder, 'cypress');
    }else {
        log(error(`${chalk.underline('src')} should be a Project Folder in which Cypress has been installed`));
    }
}

function checkDirectories( arrOfPath ) {
    return Array.prototype.every.call( arrOfPath, isDirectory);
}

function isDirectory( path ) {
    return lstatSync(path).isDirectory();
}



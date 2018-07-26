/**
 * This Package allows to specify a Cypress Test folder as input and to run the test
 * in a loop fashion a certain number of times, meanwhile watching the `screenShotsFolder`
 * for changes and copying it into a specified Destination Folder
 * * Supposing that the `trashAssetsBeforeRuns` has its default value
 */
'use strict';

/*
                ,--,           ,----,
         ,--.,---.'|         ,/   .`|                  ____
       ,--.'||   | :       ,`   .'  :                ,'  , `.                                                   ___
   ,--,:  : |:   : |     ;    ;     /             ,-+-,.' _ |                 ,---,                    ,--,   ,--.'|_
,`--.'`|  ' :|   ' :   .'___,/    ,'           ,-+-. ;   , ||               ,---.'|                  ,--.'|   |  | :,'
|   :  :  | |;   ; '   |    :     |           ,--.'|'   |  ;|               |   | :                  |  |,    :  : ' :
:   |   \ | :'   | |__ ;    |.';  ;          |   |  ,', |  ':  ,--.--.      |   | |   ,---.          `--'_  .;__,'  /
|   : '  '; ||   | :.'|`----'  |  |          |   | /  | |  || /       \   ,--.__| |  /     \         ,' ,'| |  |   |
'   ' ;.    ;'   :    ;    '   :  ;          '   | :  | :  |,.--.  .-. | /   ,'   | /    /  |        '  | | :__,'| :
|   | | \   ||   |  ./     |   |  '          ;   . |  ; |--'  \__\/: . ..   '  /  |.    ' / |        |  | :   '  : |__
'   : |  ; .';   : ;       '   :  |          |   : |  | ,     ," .--.; |'   ; |:  |'   ;   /|        '  : |__ |  | '.'|
|   | '`--'  |   ,/        ;   |.'           |   : '  |/     /  /  ,.  ||   | '/  ''   |  / |        |  | '.'|;  :    ;
'   : |      '---'         '---'             ;   | |`-'     ;  :   .'   \   :    :||   :    |        ;  :    ;|  ,   /
;   |.'                                      |   ;/         |  ,     .-./\   \  /   \   \  /         |  ,   /  ---`-'
'---'                                        '---'           `--`---'     `----'     `----'           ---`-'
*/

const { existsSync, lstatSync, readdirSync, readFileSync } = require('fs');
const { inspect } = require('util');
const { resolve, parse, join } = require('path');
const chalk = require('chalk');

//-----------------------------------------------------------------------------------------------------------
const log = console.log.bind(console);
const info = str => chalk.bold.blue('[INFO]: '+ str);
const warning = str => chalk.bold.yellow('[WARN]: '+ str);
const error =  str  => chalk.bold.red('[ERROR]: '+ str);

const utilityAbbrString = `
..######..########...######...######...######...######.
.##....##.##.....##.##....##.##....##.##....##.##....##
.##.......##.....##.##.......##.......##.......##......
.##.......########..##........######..##........######.
.##.......##...##...##.............##.##.............##
.##....##.##....##..##....##.##....##.##....##.##....##
..######..##.....##..######...######...######...######.
`;
const separatorLine = '--'.repeat(80);


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

// Clear Console
console.clear();
log(chalk.bold.blue(separatorLine));
log(chalk.bold.blue(utilityAbbrString));
log(chalk.bold.blue(separatorLine))

const [ srcPath , destPath ] = [ resolve(argv.src), resolve(argv.dest) ];
if( existsSync( srcPath) && existsSync( destPath )) {
    if( checkDirectories( [ srcPath , destPath ] )) {
        log(info(`The Src Dir Path is ${ srcPath } and the dest Dir path is ${ destPath}`));
        let [ cypressFolderPath, packageJsonPath ] = isSrcPathValid( srcPath );
        if( !cypressFolderPath ) {
            process.exit( 1 );
        }else {
            if( existsSync( cypressFolderPath ) && existsSync( packageJsonPath )) {
                getCypressScriptsFromPackageJson(packageJsonPath);
            }
        }
    }else{
        log(error(`${chalk.underline('src')} and ${chalk.underline('dest')} arguments must be directories`));
        process.exit( 1 );
    }
}


//-----------------------------------------------------------------------------------------------------------

function getCypressScriptsFromPackageJson(packageJsonPath) {
    //Read the Package JSON and retrieve the `scripts`property
    let fileContent = JSON.parse( readFileSync(packageJsonPath));
    let scriptsProperty = fileContent.scripts;
    if( scriptsProperty ) {
        log(inspect(scriptsProperty));
    }else{
        log(error(`No scripts defined in the ${chalk.underline(packageJsonPath)} file, no way to run the test!`));
    }
    
}

function isSrcPathValid( pathToFolder ) {
    //The Src Folder must have a package.json where there should
    //be scripts to run the test and also a cypress.json eventually empty
    //Where should be the Cypress configurations
    //It should also a cypress subdirectory

    let srcDirContents = readdirSync( pathToFolder );
    let parsedDirContents = [];

    Array.prototype.forEach.call( srcDirContents, dirContent => {
        parsedDirContents.push(parse(dirContent));
    });

    const hasCypressSubDirectory = function ( parsedDirContent ) {
        return (( parsedDirContent.name.toLowerCase() === 'cypress') && ( !parsedDirContent.ext));
    }
    const hasPackageJson = function ( parsedDirContent ) {
        return (( parsedDirContent.name.toLowerCase() === 'package') && (parsedDirContent.ext === '.json'));
    }

    const hasCypressJson = function ( parsedDirContent ) {
        return (( parsedDirContent.name.toLowerCase() === 'cypress') && (parsedDirContent.ext === '.json'));
    }

    if( Array.prototype.some.call( parsedDirContents, hasCypressSubDirectory) && Array.prototype.some.call( parsedDirContents, hasPackageJson)) {
        log(info(`${ pathToFolder } is a valid Src folder containing the ${chalk.underline('cypress')} subfolder and a ${chalk.underline('package.json')}`));
        if(!Array.prototype.some.call( parsedDirContents, hasCypressJson)) {
            log(warning(`No ${chalk.underline('cypress.json')} File was found. Default Cypress Configs are then expected.`));
        }
        return [ join( pathToFolder, 'cypress'), join( pathToFolder, 'package.json') ];
    }else {
        log(error(`${chalk.underline('src')} should be a Project Folder in which Cypress has been installed`));
    }
}

function checkDirectories( arrOfPath ) {
    const isDirectory = path => lstatSync(path).isDirectory();
    return Array.prototype.every.call( arrOfPath, isDirectory);
}




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
const { execSync, spawnSync } = require('child_process');

//-----------------------------------------------------------------------------------------------------------
const log = console.log.bind(console);
const info = str => chalk.bold.blue('[INFO]: '+ str);
const warning = str => chalk.bold.yellow('[WARN]: '+ str);
const err =  str  => chalk.bold.red('[ERROR]: '+ str);

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
        describe: 'The Destination directory where to copy the Screenshots on Test err',
        demandOption: true
    })
    .option('nbrOfTestExec', {
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

const [ srcPath , destPath, nbrOfTestExec  ] = [ resolve(argv.src), resolve(argv.dest), argv.nbrOfTestExec ];
if( existsSync( srcPath) && existsSync( destPath )) {
    if( checkDirectories( [ srcPath , destPath ] ) && ( nbrOfTestExec > 1)) {
        log(info(`The Src Dir Path is ${ srcPath } and the dest Dir path is ${ destPath}`));
        let [ cypressFolderPath, packageJsonPath ] = isSrcPathValid( srcPath );
        if( !cypressFolderPath ) {
            process.exit( 1 );
        }else {
            if( existsSync( cypressFolderPath ) && existsSync( packageJsonPath )) {
                let testRunScript = getCypressScriptsFromPackageJson(packageJsonPath);
                if( testRunScript ) {
                    try {
                        process.chdir(srcPath);
                        log(info(process.cwd()));
                        //Now Run a command for a specific amount of time and see the output
                        let successulExecsCount = 0;
                        //Should be `npm run ${testRunScript}`

                        for( let i=1; i <= nbrOfTestExec; i++) {
                            log(info(`Execution n° ${i}`))
                            let tmp2 = spawnSync('ls', ['-al'], {stdio:[0,1,2]});
                            log(info('------------------'));
                            let { status, stderr } = tmp2;
                            log(info(`Statussss: ${status}`))
                            if( status === 0) {
                                ++successulExecsCount;
                            }
                            if( stderr ) {
                                log(err( tmp2.stderr ));
                            }
                            log(info(inspect(tmp2)));
                            
                        }
                        let successRate = Math.floor( (successulExecsCount / nbrOfTestExec) * 100 );
                        log(info(`Success Rate: ${successRate} %`));

                    } catch (err) {
                        log(err(`chdir ${err}`));
                        process.exit(1);
                    }
                }else{
                    process.exit(1);
                }
            }
        }
    }else{
        log(err(`${chalk.underline('src')} and ${chalk.underline('dest')} arguments must be directories and ${chalk.underline('nbrOfTestExec')} should be at least 2 `));
        process.exit( 1 );
    }
}


//-----------------------------------------------------------------------------------------------------------

function getCypressScriptsFromPackageJson(packageJsonPath) {
    //Read the Package JSON and retrieve the `scripts`property
    let fileContent = JSON.parse( readFileSync(packageJsonPath));
    let scriptsProperty = fileContent.scripts;
    if( scriptsProperty ) {
        let scriptPropertykeys = Object.keys( scriptsProperty );
        let testRunScript = Array.prototype.find.call( scriptPropertykeys, scriptPropertykey => {
            let scriptPropValue = scriptsProperty[ scriptPropertykey ];
            let bool = (String.prototype.indexOf.call( scriptPropValue, 'cypress') !== -1) &&
            (String.prototype.indexOf.call( scriptPropValue, 'run') !== -1);
            return bool === true;
        });
        return testRunScript;
    }else{
        log(err(`No scripts defined in the ${chalk.underline(packageJsonPath)} file, no way to run the test!`));
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
        log(err(`${chalk.underline('src')} should be a Project Folder in which Cypress has been installed`));
    }
}

function checkDirectories( arrOfPath ) {
    const isDirectory = path => lstatSync(path).isDirectory();
    return Array.prototype.every.call( arrOfPath, isDirectory);
}




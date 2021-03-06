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

const { existsSync, lstatSync, readdirSync, readFileSync, watch } = require('fs');
const util = require('util');
const { resolve, parse, join } = require('path');
const promisifiedExec = util.promisify( require('child_process').exec);
const chalk = require('chalk');
const pSettle = require('p-settle');
const ora = require('ora');
const kill = require('tree-kill');

//-----------------------------------------------------------------------------------------------------------
const log = console.log.bind(console);
const info = str => chalk.bold.blue('[INFO]: '+ str + '\n');
const warning = str => chalk.bold.yellow('[WARN]: '+ str + '\n');
const err =  str  => chalk.bold.red('[ERROR]: '+ str + '\n');

const utilityAbbrString = `
..######..########...######...######...######...######.
.##....##.##.....##.##....##.##....##.##....##.##....##
.##.......##.....##.##.......##.......##.......##......
.##.......########..##........######..##........######.
.##.......##...##...##.............##.##.............##
.##....##.##....##..##....##.##....##.##....##.##....##
..######..##.....##..######...######...######...######.
`;
const separatorLine = '--'.repeat(30);


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

process.on('exit', (code) => {
    log(info(`About to exit with code ${code}`));
})

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
                        //Creating The Console Spinner
                        const spinner = ora(`Running the test ${nbrOfTestExec}  times \n`).start();

                        process.chdir(srcPath);
                        //Start watching the cypressFolderPath Folder for changes
                        //We'll look for changes involving the `screenshots`directory
                        watch( cypressFolderPath, (eventType, payload) => {
                            if( payload ){
                                log(warning(`\n Event type is: ${eventType} | Payload: ${payload}`));
                                let newPath = join(cypressFolderPath, payload);
                                if(existsSync(newPath)) {
                                    let screenshotDirContent = readdirSync( newPath );
                                    log(info(`The path ${newPath} exists`));
                                    log(info(util.inspect(screenshotDirContent)));
                                }
                            }
                        });
                        //Now Run a command for a specific amount of time and see the output
                        let successulExecsCount = 0;
                        let promisesArray = [];
                        //Should be `npm run ${testRunScript}`

                        for( let i=1; i <= nbrOfTestExec; i++) {
                            promisesArray.push( promisifiedExec(`npm run ${testRunScript}`));
                            /* 
                            log(info(`Execution n° ${i}`))
                            let tmp = spawnSync('npm', [ 'run', testRunScript ], {stdio:[0,1,2]});
                            let { status, stderr } = tmp;
                            if( status === 0) {
                                ++successulExecsCount;
                            }
                            if( stderr ) {
                                log(err( tmp.stderr ));
                            } */
                        }
                        pSettle( promisesArray ).then( result => {
                            spinner.stop();
                            
                            log(info('The promises Array'));
                            log(util.inspect( promisesArray ));
                            log(warning(`Root Process PID is : ${process.pid}`));
                            kill(process.pid);

                            //log(info(util.inspect(process._getActiveRequests())));
                            //log(info(util.inspect(process._getActiveHandles())));
                            //log(util.inspect( result ));
                            process.exitCode = 0;
                        });
                        /* Promise.all(promisesArray).then( result => {
                            log(util.inspect( result ));
                            log(info('Execution finished....about to exit'));
                            process.exit(0);
                        }).catch( error => log(error( error ))); */
                    } catch (err) {
                        log(err(`chdir ${err}`));
                        process.exitCode = 1;
                    }
                }else{
                    process.exitCode = 1;
                }
            }
        }
    }else{
        log(err(`${chalk.underline('src')} and ${chalk.underline('dest')} arguments must be directories and ${chalk.underline('nbrOfTestExec')} should be at least 2 `));
        process.exitCode = 1;
    }
}else {
    log(err(`${chalk.underline('src')} and ${chalk.underline('dest')} should exist on the file system`));
    process.exitCode = 1;
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




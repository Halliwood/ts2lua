// Type definitions for index.js
// Project: https://github.com/Halliwood/ts2lua 
// Definitions by: Halliwood <https://github.com/Halliwood> 
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/**
 * 
 */
export declare var fs : /*no type*/{};

/**
 * 
 */
export declare var lm : /*no type*/{};

/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
declare function translate(tsCode : any): void;

/**
 * 
 */
export declare var saveASTFile : boolean;

/**
 * 
 */
export declare var fileCnt : number;

/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 */
declare function translateFiles(inputPath : any, outputPath : any): void;

/**
 * 
 * @param dirPath 
 */
declare function readDir(dirPath : any): void;

/**
 * 
 * @param filePath 
 */
declare function doTranslateFile(filePath : any): void;

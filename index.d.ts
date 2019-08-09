// Type definitions for index.js
// Project: https://github.com/Halliwood/ts2lua 
// Definitions by: Halliwood <https://github.com/Halliwood> 
// Definitions: https://github.com/borisyankov/DefinitelyTyped

export interface TranslateOption {
  ext?: string
}

/**
 * 
 */
declare var fs : /*no type*/{};

/**
 * 
 */
declare var lm : /*no type*/{};

/**
 * 
 */
declare var luaFilesToCopy : Array<string>;

/**
 * 
 */
declare var inputFolder : string;

/**
 * 
 */
declare var outputFolder : string;

/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
export declare function translate(tsCode : string): string;

/**
 * 
 */
declare var devMode : boolean;

/**
 * 
 */
declare var fileCnt : number;

/**
 * 
 */
declare var luaExt : string;

/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 * @param option translate option
 */
export declare function translateFiles(inputPath : string, outputPath : string, option : TranslateOption): void;

/**
 * 
 * @param dirPath 
 */
declare function readDir(dirPath : string): void;

/**
 * 
 * @param filePath 
 */
declare function doTranslateFile(filePath : string): void;

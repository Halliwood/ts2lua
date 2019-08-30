// Type definitions for index.js
// Project: https://github.com/Halliwood/ts2lua 
// Definitions by: Halliwood <https://github.com/Halliwood> 
// Definitions: https://github.com/borisyankov/DefinitelyTyped

export interface TranslateOption {
  /**生成lua代码文件后缀名，默认为'.lua' */
  ext?: string, 
  /**lua代码风格，默认适配xlua */
  style?: 'xlua' | null, 
  /**是否在生成的lua代码中，增加ts2lua认为有必要人工处理的提示，默认为true */
  addTip?: boolean,
  /**函数名替换配置json文件路径，默认为lib\\func.json */
  funcReplConfJson?: string, 
  /**正则表达式替换配置json文件路径，默认为lib\\regex.json */
  regexReplConfJson?: string, 
  /**对于没有替换配置的正则表达式，是否尝试简单翻译成lua，默认false。如果为true，则将正则表达式翻译为字符串，将转义符翻译成%。 */
  translateRegex?: boolean,
  /**输出未识别的正则表达式的文件路径，默认不输出 */
  traceUnknowRegex?: string,
  /**是否忽略代码块中单纯的成员表达式，默认为true */
  ignoreNoUsedExp?: boolean, 
  /**字符串处理函数 */
  strLiteralProcessor?: (str: string) => string | null
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
export declare function translate(tsCode : string, option ?: TranslateOption): string;

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
export declare function translateFiles(inputPath : string, outputPath : string, option ?: TranslateOption): void;

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

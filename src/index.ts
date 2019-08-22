import * as fs from 'fs';
import path = require('path');
import util = require('util')
import parser = require('@typescript-eslint/typescript-estree');
import { LuaMaker } from './gen/LuaMaker';
import { TsCollector } from './gen/TsCollector';
import { Program } from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';

const luaFilesToCopy: string[] = ['class', 'trycatch', 'date'];

export interface TranslateOption {
  /**生成lua代码文件后缀名，默认为'.lua' */
  ext?: string, 
  /**lua代码风格，默认适配xlua */
  style?: 'xlua' | null, 
  /**是否在生成的lua代码中，增加ts2lua认为有必要人工处理的提示，默认为true */
  addTip?: boolean,
  /**是否将所有require语句写入到require.<$ext>中，默认false */
  requireAllInOne?: boolean, 
  /**函数名替换配置json文件路径，默认为lib\\func.json */
  funcReplConfJson?: string, 
  /**正则表达式替换配置txt文件路径，默认为lib\\regex.txt */
  regexReplConfTxt?: string, 
  /**对于没有替换配置的正则表达式，是否尝试简单翻译成lua，默认false。如果为true，则将正则表达式翻译为字符串，将转义符翻译成%。 */
  translateRegex?: boolean,
  /**输出未识别的正则表达式的txt文件路径，默认不输出 */
  traceUnknowRegex?: string
}

const devMode: boolean = false;
let fileCnt = 0;
let luaExt: string = '.lua';
let luaStyle: string = 'xlua';
let addTip: boolean = true;
let requireAllInOne: boolean = false;
let requireContent = '';
let funcReplConf: {[func: string]: string} = {};
let regexReplConf: {[regex: string]: string} = {};
let translateRegex: boolean;
let traceUnknowRegex: string;

let tc = new TsCollector();
let lm = new LuaMaker();

let astMap: { [path: string]: Program } = {};

let inputFolder: string;
let outputFolder: string;
// translateFiles('G:\\ly\\trunk\\TsScripts', 
//   // 'G:\\ly\\trunk\\Assets\\StreamingAssets\\luaScript', 
//   'test\\out',
//   {
//     ext: '.lua.txt', 
//     translateRegex: true, 
//     funcReplConfJson: 'lib\\func.json',
//     regexReplConfTxt: 'lib\\regex.txt'
//   });
/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
export function translate(tsCode: string, option?: TranslateOption): string {
  processOption(option);

  const parsed = parser.parse(tsCode);
  tc.collect(parsed);
  lm.setClassMap(tc.classMap);
  let luaCode = lm.toLua(parsed, 'Source', '');
  collectUnknowRegex();
  return luaCode;
}

/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 */
export function translateFiles(inputPath: string, outputPath: string, option?: TranslateOption) {
  processOption(option);

  // copy class.lua & trycatch.lua
  fs.mkdirSync(outputPath, { recursive: true });
  for(let luaFile of luaFilesToCopy) {
    fs.copyFileSync(path.join(__dirname, 'lua', luaFile) + '.lua', path.join(outputPath, luaFile) + luaExt);
  }

  inputFolder = inputPath;
  outputFolder = outputPath;
  fileCnt = 0;
  let inputStat = fs.statSync(inputPath);
  if(inputStat.isFile()) {
    collectClass(inputPath);
    lm.setClassMap(tc.classMap);
    doTranslateFile(inputPath);
  } else {
    console.log('Processing... Please wait.');
    readDir(inputPath, true);
    console.log('Making lua... Please wait.');
    lm.setClassMap(tc.classMap);
    readDir(inputPath, false);
  }

  if(requireAllInOne) {
    fs.writeFileSync(path.join(outputPath, 'require') + luaExt, requireContent);
  }

  console.log("\x1B[36m%d\x1B[0m .lua files generated.", fileCnt);
  collectUnknowRegex();
}

function readDir(dirPath: string, collectOrTranslate: boolean) {
  let files = fs.readdirSync(dirPath);
  for(let i = 0, len = files.length; i < len; i++) {
    let filename = files[i];
    let filePath = path.join(dirPath, filename);
    let fileStat = fs.statSync(filePath);
    if(fileStat.isFile()) {
      let fileExt = path.extname(filename).toLowerCase();
      if('.ts' == fileExt) {
        if(collectOrTranslate) {
          collectClass(filePath);
        } else {
          doTranslateFile(filePath);
        }
      }
    } else {
      readDir(filePath, collectOrTranslate);
    }
  }
}

function collectClass(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = parser.parse(fileContent);
  astMap[filePath] = parsed;
  tc.collect(parsed);
}

function doTranslateFile(filePath: string) {
  // console.log('parsing: ', filePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  // const parsed = parser.parse(fileContent);
  const parsed = astMap[filePath];

  let outFilePath = filePath.replace(inputFolder, outputFolder);
  let fileFolder = outFilePath.substr(0, outFilePath.lastIndexOf('\\'));
  fs.mkdirSync(fileFolder, { recursive: true });

  if(devMode) {
    let str = util.inspect(parsed, true, 100);
    fs.writeFileSync(outFilePath.replace(/\.ts$/, '.txt'), str);
  }

  let luaContent = lm.toLua(parsed, filePath, inputFolder);
  let luaFilePath = outFilePath.replace(/\.ts$/, luaExt);
  fs.writeFileSync(luaFilePath, luaContent);

  if(requireAllInOne) {
    let importStr = path.relative(inputFolder, filePath).replace(/\\+/g, '/');
    requireContent += 'require("' + importStr.substr(0, importStr.length - 3) + '")\n';
  }

  fileCnt++;
}

function processOption(option?: TranslateOption) {
  if(option) {
    if(option.ext) {
      luaExt = option.ext;
    }
    if(undefined !== option.style) {
      luaStyle = option.style;
    }
    if(undefined !== option.addTip) {
      addTip = option.addTip;
    }
    if(undefined !== option.requireAllInOne) {
      requireAllInOne = option.requireAllInOne;
    }
    let funcReplConfJson = path.join(__dirname, 'lib\\func.json');
    if(undefined !== option.funcReplConfJson) {
      funcReplConfJson = option.funcReplConfJson;
    }
    let frj = fs.readFileSync(funcReplConfJson, 'utf-8');
    funcReplConf = JSON.parse(frj);
    let regexReplConfTxt = path.join(__dirname, 'lib\\regex.txt');
    if(undefined !== option.regexReplConfTxt) {
      regexReplConfTxt = option.regexReplConfTxt;
    }
    let rrt = fs.readFileSync(regexReplConfTxt, 'utf-8');
    let rrLines = rrt.split(/[\r\n]+/);
    for(let rrline of rrLines) {
      if(rrline) {
        let rrPair = rrline.split(/,\s*/);
        if(rrPair.length > 1) {
          regexReplConf[rrPair[0]] = rrPair[1];
        }
      }
    }
    if(undefined !== option.translateRegex) {
      translateRegex = option.translateRegex;
    }
    if(option.traceUnknowRegex) {
      traceUnknowRegex = option.traceUnknowRegex;
    }
  }
  lm.setEnv(devMode, luaStyle, addTip, requireAllInOne, funcReplConf, regexReplConf, translateRegex);
}

function collectUnknowRegex() {
  if(traceUnknowRegex && lm.unknowRegexs.length > 0) {
    lm.unknowRegexs.sort();
    let unknowRegexContent = '';
    for(let ur of lm.unknowRegexs) {
      unknowRegexContent += ur + ',\n';
    }
    fs.writeFileSync(traceUnknowRegex, unknowRegexContent, 'utf-8');

    console.log("\x1B[36m%d\x1B[0m unknown regular expression.", lm.unknowRegexs.length);
  }
}
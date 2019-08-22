import * as fs from 'fs';
import path = require('path');
import util = require('util')
import parser = require('@typescript-eslint/typescript-estree');
import { TranslateOption } from './gen/TranslateOption';
import { LuaMaker } from './gen/LuaMaker';
import { TsCollector } from './gen/TsCollector';
import { Program } from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';

const luaFilesToCopy: string[] = ['class', 'trycatch', 'date'];

const devMode: boolean = false;
let fileCnt = 0;
let requireContent = '';
let funcReplConf: {[func: string]: string} = {};
let regexReplConf: {[regex: string]: string} = {};


  
let luaExt: string = '.lua';
let luaStyle: string = 'xlua';
let addTip: boolean = true;
let breakUpFiles: boolean = true;
let requireAllInOne: boolean = false;
let translateRegex: boolean;
let traceUnknowRegex: string;

let opt: TranslateOption = { 
  ext: '.lua', 
  style: 'xlua', 
  addTip: true, 
  breakUpFiles: true, 
  requireAllInOne: false,
  funcReplConfJson: path.join(__dirname, 'lib\\func.json'),
  regexReplConfTxt: path.join(__dirname, 'lib\\regex.txt'),
  translateRegex: false,
  traceUnknowRegex: undefined
};
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
  for(let key in option) {
    opt[key] = option[key];
  }
  if(option.funcReplConfJson) {
    let frj = fs.readFileSync(option.funcReplConfJson, 'utf-8');
    funcReplConf = JSON.parse(frj);
  }
  if(option.regexReplConfTxt) {
    let rrt = fs.readFileSync(option.regexReplConfTxt, 'utf-8');
    let rrLines = rrt.split(/[\r\n]+/);
    for(let rrline of rrLines) {
      if(rrline) {
        let rrPair = rrline.split(/,\s*/);
        if(rrPair.length > 1) {
          regexReplConf[rrPair[0]] = rrPair[1];
        }
      }
    }
  }
  lm.setEnv(devMode, opt, funcReplConf, regexReplConf);
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
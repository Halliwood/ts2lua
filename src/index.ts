import * as fs from 'fs';
import path = require('path');
import util = require('util')
import parser = require('@typescript-eslint/typescript-estree');
import * as lm from './gen/LuaMaker';

let inputFolder: string;
let outputFolder: string;
// translateFiles('G:\\ly\\trunk\\TsScripts', 'test\\out');

/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
export function translate(tsCode: string): string {
  const parsed = parser.parse(tsCode);
  return lm.toLua(parsed, 'Source', devMode);
}

// let inputFolder: string;
// let outputFolder: string;
const devMode: boolean = false;
let fileCnt = 0;

/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 */
export function translateFiles(inputPath: string, outputPath: string) {
  inputFolder = inputPath;
  outputFolder = outputPath;
  fileCnt = 0;
  let inputStat = fs.statSync(inputPath);
  if(inputStat.isFile()) {
    doTranslateFile(inputPath);
  } else {
    readDir(inputPath);
  }
  console.log("\x1B[36m%d\x1B[0m .lua files generated.", fileCnt);
}

function readDir(dirPath: string) {
  let files = fs.readdirSync(dirPath);
  for(let i = 0, len = files.length; i < len; i++) {
    let filename = files[i];
    let filePath = path.join(dirPath, filename);
    let fileStat = fs.statSync(filePath);
    if(fileStat.isFile()) {
      let fileExt = path.extname(filename).toLowerCase();
      if('.ts' == fileExt) {
        doTranslateFile(filePath);
      }
    } else {
      readDir(filePath);
    }
  }
}

function doTranslateFile(filePath: string) {
  // console.log('parsing: ', filePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = parser.parse(fileContent);

  let outFilePath = filePath.replace(inputFolder, outputFolder);
  let fileFolder = outFilePath.substr(0, outFilePath.lastIndexOf('\\'));
  fs.mkdirSync(fileFolder, { recursive: true });

  if(devMode) {
    let str = util.inspect(parsed, true, 100);
    fs.writeFileSync(outFilePath.replace(/\.ts$/, '.txt'), str);
  }

  let luaContent = lm.toLua(parsed, filePath, devMode);
  let luaFilePath = outFilePath.replace(/\.ts$/, '.lua');
  fs.writeFileSync(luaFilePath, luaContent);  

  fileCnt++;
}
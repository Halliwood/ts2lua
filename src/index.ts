import * as fs from 'fs';
import path = require('path');
import util = require('util')
import parser = require('@typescript-eslint/typescript-estree');
import * as lm from './gen/LuaMaker';

// const args = process.argv.splice(2);
// const inputFolder = 'G:\\ly\\trunk\\TsScripts';
// const inputFolder = 'test\\in';
// const outputFolder = 'test\\out';
// readDir(inputFolder);

export function translate(tsCode: string): string {
  const parsed = parser.parse(tsCode);
  return lm.toLua(parsed);
}

let inputFolder: string;
let outputFolder: string;
const saveASTFile: boolean = false;
export function translateFiles(inputPath: string, outputPath: string) {
  inputFolder = inputPath;
  outputFolder = outputPath;
  let inputStat = fs.statSync(inputPath);
  if(inputStat.isFile()) {
    doTranslateFile(inputPath);
  } else {
    readDir(inputPath);
  }
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

  if(saveASTFile) {
    let str = util.inspect(parsed, true, 100);
    fs.writeFileSync(outFilePath.replace(/\.ts$/, '.txt'), str);
  }

  let luaContent = lm.toLua(parsed);
  let luaFilePath = outFilePath.replace(/\.ts$/, '.lua');
  fs.writeFileSync(luaFilePath, luaContent);
}
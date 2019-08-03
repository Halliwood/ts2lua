import * as fs from 'fs';
import path = require('path');
import sf = require('string-format');
import util = require('util')
import parser = require('@typescript-eslint/typescript-estree');
import * as lm from './gen/LuaMaker';

const args = process.argv.splice(2);
// const inputFolder = 'G:\\ly\\trunk\\TsScripts\\Diff\\view';
const inputFolder = 'test\\in';
const outputFolder = 'test\\out';

readDir(inputFolder);

async function readDir(dirPath: string) {
  let files = fs.readdirSync(dirPath);
  for(let i = 0, len = files.length; i < len; i++) {
    let filename = files[i];
    let filePath = path.join(dirPath, filename);
    let fileStat = fs.statSync(filePath);
    if(fileStat.isFile()) {
      let fileExt = path.extname(filename).toLowerCase();
      if('.ts' == fileExt) {
        await translate(filePath);
      }
    } else {
      await readDir(filePath);
    }
  }
}

async function translate(filePath: string) {
  console.log(sf('parsing: {0}', filePath));
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = await parser.parse(fileContent);
  // const parsed = await parser.parseSource('let a = 123, b =456;');
  let str = util.inspect(parsed, true, 10);
  fs.writeFileSync(filePath.replace(inputFolder, outputFolder).replace(/\.ts$/, '.txt'), str);

  let luaContent = lm.toLua(parsed);
  let luaFilePath = filePath.replace(inputFolder, outputFolder).replace(/\.ts$/, '.lua');
  fs.writeFileSync(luaFilePath, luaContent);
}
import * as fs from 'fs';
import path = require('path');
import util = require('util')
import parser = require('@typescript-eslint/typescript-estree');
import { LuaMaker } from './gen/LuaMaker';

const luaFilesToCopy: string[] = ['class', 'trycatch'];
const luaTemlates: {[name: string]: string} = {
  'class': `Class = {};
Class.__index = Class

Class.name = "Object";

local Class_Constructor = {};
Class_Constructor.__call = function (type, ...)
    local instance = {};
    instance.class = type;
    setmetatable(instance, type.prototype);
    instance:ctor(...)
    return instance;
end
setmetatable(Class, Class_Constructor);
Class.__call = Class_Constructor.__call;

function Class:subclass(typeName)	
  -- 以传入类型名称作为全局变量名称创建table
  _G[typeName] = {};

  -- 设置元方法__index,并绑定父级类型作为元表
  local subtype = _G[typeName];

  subtype.name = typeName;
  subtype.super = self;
  subtype.__call = Class_Constructor.__call;
  subtype.__index = subtype;
  setmetatable(subtype, self);

  -- 创建prototype并绑定父类prototype作为元表
  subtype.prototype = {};
  subtype.prototype.__index = subtype.prototype;
  subtype.prototype.__gc = self.prototype.__gc;
  subtype.prototype.ctor = self.prototype.ctor;
  subtype.prototype.__tostring = self.prototype.__tostring;
  subtype.prototype.instanceof = self.prototype.instanceof;
  setmetatable(subtype.prototype, self.prototype);

  return subtype;
end

Class.prototype = {};
Class.prototype.__index = Class.prototype;
Class.prototype.__gc = function (instance)
  print(instance, "destroy");
end
Class.prototype.ctor = function(instance)
end

Class.prototype.__tostring = function (instance)	
  return "[" .. instance.class.name .." object]";
end

Class.prototype.instanceof = function(instance, typeClass)
  if typeClass == nil then
    return false
  end

  if instance.class == typeClass then
    return true
  end

  local theSuper = instance.class.super
  while(theSuper ~= nil) do
    if theSuper == typeClass then
      return true
    end
    theSuper = theSuper.super
  end
  return false
end`,
  'trycatch': `-- 异常捕获
function try_catch(block)
  local main = block.main
  local catch = block.catch
  local finally = block.finally

  assert(main)

  -- try to call it
  local ok, errors = xpcall(main, debug.traceback)
  if not ok then
      -- run the catch function
      if catch then
          catch(errors)
      end
  end

  -- run the finally function
  if finally then
      finally(ok, errors)
  end

  -- ok?
  if ok then
      return errors
  end
end`
}

let inputFolder: string;
let outputFolder: string;
// translateFiles('G:\\ly\\trunk\\TsScripts', 'test\\out');

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

let lm = new LuaMaker();

/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
export function translate(tsCode: string, option?: TranslateOption): string {
  processOption(option);

  const parsed = parser.parse(tsCode);
  collectUnknowRegex();
  return lm.toLua(parsed, 'Source', '');
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
    fs.writeFileSync(path.join(outputPath, luaFile) + luaExt, luaTemlates[luaFile]);
  }

  inputFolder = inputPath;
  outputFolder = outputPath;
  fileCnt = 0;
  let inputStat = fs.statSync(inputPath);
  if(inputStat.isFile()) {
    doTranslateFile(inputPath);
  } else {
    readDir(inputPath);
  }

  if(requireAllInOne) {
    fs.writeFileSync(path.join(outputPath, 'require') + luaExt, requireContent);
  }

  console.log("\x1B[36m%d\x1B[0m .lua files generated.", fileCnt);
  collectUnknowRegex();
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
    let funcReplConfJson = 'node_modules\\ts2lua\\lib\\func.json';
    if(undefined !== option.funcReplConfJson) {
      funcReplConfJson = option.funcReplConfJson;
    }
    let frj = fs.readFileSync(funcReplConfJson, 'utf-8');
    funcReplConf = JSON.parse(frj);
    let regexReplConfTxt = 'node_modules\\ts2lua\\lib\\regex.txt';
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
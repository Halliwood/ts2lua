import * as fs from 'fs';
import path = require('path');
import util = require('util')
import parser = require('@typescript-eslint/typescript-estree');
import * as lm from './gen/LuaMaker';

const luaFilesToCopy: string[] = ['class.lua', 'trycatch.lua'];
const luaTemlates: {[name: string]: string} = {
  'class.lua': `Class = {};
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
  'trycatch.lua': `-- 异常捕获
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
  ext?: string
}

/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
export function translate(tsCode: string): string {
  const parsed = parser.parse(tsCode);
  return lm.toLua(parsed, 'Source', devMode);
}

const devMode: boolean = false;
let fileCnt = 0;
let luaExt: string = '.lua';

/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 */
export function translateFiles(inputPath: string, outputPath: string, option?: TranslateOption) {
  // copy class.lua & trycatch.lua
  fs.mkdirSync(outputPath, { recursive: true });
  for(let luaFile of luaFilesToCopy) {
    fs.writeFileSync(path.join(outputPath, luaFile), luaTemlates[luaFile]);
  }

  if(option && option.ext) {
    luaExt = option.ext;
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
  let luaFilePath = outFilePath.replace(/\.ts$/, luaExt);
  fs.writeFileSync(luaFilePath, luaContent);  

  fileCnt++;
}
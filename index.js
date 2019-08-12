"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var path = require("path");
var util = require("util");
var parser = require("@typescript-eslint/typescript-estree");
var lm = __importStar(require("./gen/LuaMaker"));
var luaFilesToCopy = ['class', 'trycatch'];
var luaTemlates = {
    'class': "Class = {};\nClass.__index = Class\n\nClass.name = \"Object\";\n\nlocal Class_Constructor = {};\nClass_Constructor.__call = function (type, ...)\n    local instance = {};\n    instance.class = type;\n    setmetatable(instance, type.prototype);\n    instance:ctor(...)\n    return instance;\nend\nsetmetatable(Class, Class_Constructor);\nClass.__call = Class_Constructor.__call;\n\nfunction Class:subclass(typeName)\t\n  -- \u4EE5\u4F20\u5165\u7C7B\u578B\u540D\u79F0\u4F5C\u4E3A\u5168\u5C40\u53D8\u91CF\u540D\u79F0\u521B\u5EFAtable\n  _G[typeName] = {};\n\n  -- \u8BBE\u7F6E\u5143\u65B9\u6CD5__index,\u5E76\u7ED1\u5B9A\u7236\u7EA7\u7C7B\u578B\u4F5C\u4E3A\u5143\u8868\n  local subtype = _G[typeName];\n\n  subtype.name = typeName;\n  subtype.super = self;\n  subtype.__call = Class_Constructor.__call;\n  subtype.__index = subtype;\n  setmetatable(subtype, self);\n\n  -- \u521B\u5EFAprototype\u5E76\u7ED1\u5B9A\u7236\u7C7Bprototype\u4F5C\u4E3A\u5143\u8868\n  subtype.prototype = {};\n  subtype.prototype.__index = subtype.prototype;\n  subtype.prototype.__gc = self.prototype.__gc;\n  subtype.prototype.ctor = self.prototype.ctor;\n  subtype.prototype.__tostring = self.prototype.__tostring;\n  subtype.prototype.instanceof = self.prototype.instanceof;\n  setmetatable(subtype.prototype, self.prototype);\n\n  return subtype;\nend\n\nClass.prototype = {};\nClass.prototype.__index = Class.prototype;\nClass.prototype.__gc = function (instance)\n  print(instance, \"destroy\");\nend\nClass.prototype.ctor = function(instance)\nend\n\nClass.prototype.__tostring = function (instance)\t\n  return \"[\" .. instance.class.name ..\" object]\";\nend\n\nClass.prototype.instanceof = function(instance, typeClass)\n  if typeClass == nil then\n    return false\n  end\n\n  if instance.class == typeClass then\n    return true\n  end\n\n  local theSuper = instance.class.super\n  while(theSuper ~= nil) do\n    if theSuper == typeClass then\n      return true\n    end\n    theSuper = theSuper.super\n  end\n  return false\nend",
    'trycatch': "-- \u5F02\u5E38\u6355\u83B7\nfunction try_catch(block)\n  local main = block.main\n  local catch = block.catch\n  local finally = block.finally\n\n  assert(main)\n\n  -- try to call it\n  local ok, errors = xpcall(main, debug.traceback)\n  if not ok then\n      -- run the catch function\n      if catch then\n          catch(errors)\n      end\n  end\n\n  -- run the finally function\n  if finally then\n      finally(ok, errors)\n  end\n\n  -- ok?\n  if ok then\n      return errors\n  end\nend"
};
var inputFolder;
var outputFolder;
var devMode = false;
var fileCnt = 0;
var luaExt = '.lua';
var luaStyle = 'xlua';
/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
function translate(tsCode, option) {
    processOption(option);
    var parsed = parser.parse(tsCode);
    return lm.toLua(parsed, 'Source', devMode, luaStyle);
}
exports.translate = translate;
/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 */
function translateFiles(inputPath, outputPath, option) {
    processOption(option);
    // copy class.lua & trycatch.lua
    fs.mkdirSync(outputPath, { recursive: true });
    for (var _i = 0, luaFilesToCopy_1 = luaFilesToCopy; _i < luaFilesToCopy_1.length; _i++) {
        var luaFile = luaFilesToCopy_1[_i];
        fs.writeFileSync(path.join(outputPath, luaFile) + luaExt, luaTemlates[luaFile]);
    }
    inputFolder = inputPath;
    outputFolder = outputPath;
    fileCnt = 0;
    var inputStat = fs.statSync(inputPath);
    if (inputStat.isFile()) {
        doTranslateFile(inputPath);
    }
    else {
        readDir(inputPath);
    }
    console.log("\x1B[36m%d\x1B[0m .lua files generated.", fileCnt);
}
exports.translateFiles = translateFiles;
function readDir(dirPath) {
    var files = fs.readdirSync(dirPath);
    for (var i = 0, len = files.length; i < len; i++) {
        var filename = files[i];
        var filePath = path.join(dirPath, filename);
        var fileStat = fs.statSync(filePath);
        if (fileStat.isFile()) {
            var fileExt = path.extname(filename).toLowerCase();
            if ('.ts' == fileExt) {
                doTranslateFile(filePath);
            }
        }
        else {
            readDir(filePath);
        }
    }
}
function doTranslateFile(filePath) {
    // console.log('parsing: ', filePath);
    var fileContent = fs.readFileSync(filePath, 'utf-8');
    var parsed = parser.parse(fileContent);
    var outFilePath = filePath.replace(inputFolder, outputFolder);
    var fileFolder = outFilePath.substr(0, outFilePath.lastIndexOf('\\'));
    fs.mkdirSync(fileFolder, { recursive: true });
    if (devMode) {
        var str = util.inspect(parsed, true, 100);
        fs.writeFileSync(outFilePath.replace(/\.ts$/, '.txt'), str);
    }
    var luaContent = lm.toLua(parsed, filePath, devMode, luaStyle);
    var luaFilePath = outFilePath.replace(/\.ts$/, luaExt);
    fs.writeFileSync(luaFilePath, luaContent);
    fileCnt++;
}
function processOption(option) {
    if (option) {
        if (option.ext) {
            luaExt = option.ext;
        }
        luaStyle = option.style;
    }
}

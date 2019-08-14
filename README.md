# ts2lua
ts2lua是一个将TypeScript代码转换为lua代码的工具。它使用一套简单的[lua面向对象写法](lua/class.lua "class.lua定义")，可以将TypeScipt类翻译成lua代码。

## 安装
```
$ npm i ts2lua
```

## 用法
转换TypeScript语句

```JavaScript
const ts2lua = require('ts2lua');
const tsCode = 'let a = "Hello World!";';
const luaCode = ts2lua.translate(tsCode);
console.log(luaCode);
```

TypeScript
```TypeScript
import ts2lua = require('ts2lua');

let testCode = `
let num = 123;
if(num > 100) {
  console.log(num + ' is bigger than 100!');
} else {
  console.log(num + ' is smaller than 100!');
}
`
console.log(ts2lua.translate(testCode));
```

批量转换TypeScript文件

```JavaScript
const ts2lua = require('ts2lua');
const inputPath = 'ts_file_root';
conse outputPath = 'lua_file_root';
ts2lua.translateFiles(inputPath, outputPath);
// 指定生成lua文件后缀名
ts2lua.translateFiles(inputPath, outputPath, { ext: '.lua.txt' });
```

## 批量转换接口的说明
使用`translateFiles`可以批量转换TypeScript代码。先来看看index.d.ts的声明：

```TypeScript
/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 * @param option translate option
 */
export declare function translateFiles(inputPath : string, outputPath : string, option ?: TranslateOption): void;
```

其中，必选参数`inputPath`和`outputPath`分别表示TypeScript文件目录和生成的lua文件目录。必选参数`option`表示转换选项，当前支持如下选项：

```TypeScript
export interface TranslateOption {
  ext?: string, 
  style?: 'xlua' | null
}
```

可选字段`ext`表示生成lua文件后缀，比如可以指定为`.lua.txt`。可选字段`style`表示生成lua代码的风格，默认是xlua风格，ts2lua会按照xlua的一些规范生成对应的lua代码，详细见下方说明。如果不使用xlua风格，请设置`style`为`null`，如下所示：

```JavaScript
ts2lua.translateFiles('in', 'out', { style: null });
```

## 关于变量名、函数名不符合lua规范的处理
如果变量名、函数名为lua关键字，则自动添加`tsvar_`的前缀。如果包含`$`等lua不支持的字符，则自动将`$`替换为`tsvar_`。

## 关于数组下标访问的处理
由于lua的下标从1开始，所以对于类似`arr[i]`这种会转化为`arr[i+1]`，而对于`arr[idx]`这种则不会进行+1处理，ts2lua会自动添加注释提醒您人工确认转换结果是否正确。
比如，下述代码将转换为

TypeScript
```TypeScript
doStr() {
  if(this.subValue > 10) {
    console.log('subValue is bigger than 10: ' + this.subValue + ', yes!');
  } else {
    console.log('subValue is smaller than 10: ' + this.subValue + ', no!');
  }
  for(let i = 0, len = this.myArr.length; i < len; i++) {
    console.log(this.myArr[i]);
  }
  let idx = 2;
  console.log('this.myArr[2] == ' + this.myArr[idx]);
}
```

lua
```lua
function TestSub.prototype:doStr()
  if self.subValue>10 then
    print('subValue is bigger than 10: '..self.subValue..', yes!')
    
  else
    print('subValue is smaller than 10: '..self.subValue..', no!')
    
  end
  
  local i=0
  local len=#self.myArr
  repeat
    print(self.myArr[i+1])
    i=i+1
  until not(i<len)
  local idx=2
  -- [ts2lua]self.myArr下标访问可能不正确
  print('this.myArr[2] == '..self.myArr[idx])
end
```

## 关于数组长度length的处理
读取数组长度`arr.length`将处理成`#arr`，而修改数组长度则不做任何处理，请搜索ts2lua提示进行手动处理。比如下述代码转化为

TypeScript
```TypeScript
let arr = [1, 2, 3];
console.log('数组长度为' + arr.length);
arr.length = 0;
```

lua
```lua
local arr = {1, 2, 3}
print('数组长度为' .. #arr)
-- [ts2lua]修改数组长度需要手动处理。
arr.length = 0
```

## 关于运算符+的处理
由于TypeScript采用+进行字符串连接，而lua采用..运算符。ts2lua在转换时尽可能识别字符串连接，但可能存在识别失败的情况，比如下述代码转化为

TypeScript
```TypeScript
public log(s: string) {
    this._log += s;
    this._log += '\n';
}
```

lua
```lua
function Result.prototype:log(s)
  self._log = self._log + s
  self._log = self._log .. '\n'
end
```

## 关于数组push的处理
所有名字为push的方法都会处理成table.concat。

## 关于自增/增减的处理(UpdateExpression)
由于lua没有自增/自减运算符，所以类似`A++`会处理成`A = A + 1`。不可避免地，由于语法之间的差异，比如TypeScript的语句`myArr[A++]`会被处理成`myArr[A = A + 1]`，这在lua中是错误的。对于类似情况，ts2lua的转化结果可能不正确，需要手动处理。比如下述代码转化为：

TypeScript
```TypeScript
d = arr[d++] + arr[d];
```

lua
```lua
d = arr[d=d+1] + arr[d+1]
```

上述代码是有问题的，您需要根据实际语境进行手动修改。

## 关于形如a = b = c的赋值表达式的处理
由于lua不允许类似`a = b = c`的语法，ts2lua将处理成`b = c`和`a = b`两个语句，比如下述代码转化为：

TypeScript
```TypeScript
let a = 1, b = 2, c = 3;
let d = a = b = c;
a *= b -= c;
a = b /= c;
```

lua
```lua
local a = 1
local b = 2
local c = 3
b = c
a = b
local d = a
b = b - c
a = a * b
b = b / c
a = b
```

## 关于===和!==的处理
`===`和`!==`将转换为`==`和`~=`，这在可以预见的大部分情况下是正确的。反而值得注意的是，TypeScript中的`==`和lua中的`==`可能在某些情况下存在不同的结果。比如下述代码：

TypeScript
```TypeScript
let a = 1
if(a == true) {
  console.log('1 equals to true in TypeScript');  // a == true 成立
} else {
  console.log('1 not equals to true in TypeScript!');
}
```

lua
```lua
local a = 1
if a == true then
  print('1 equals to true in lua.')
else
  print('1 not equals to true in lua!')  -- a == true 不成立
end
```

ts2lua仅仅将`==`和`!=`转换为lua对应的`==`和`~=`，不会进行任何特殊处理，您还需要根据具体语境进行可能的修改。

## 关于try-catch的处理
ts2lua使用了[模拟实现lua try-catch](lua/trycatch.lua "trycatch.lua定义")来转换TypeScript的try-catch语句。

## 关于正则表达式的处理
由于lua不适用POSIX规范的正则表达式，因此写法上与TypeScript存在很多的差异和限制。部分TypeScript正则表达式的特效并无法简单地在lua中实现，比如lookahead和lookbehind。因此ts2lua不对正则表达式进行处理，在生成lua代码时插入如下注释，请搜索该注释并手动处理。

## 关于接口的处理(TSInterfaceDeclaration)
由于lua没有类型的概念，为方便，所有接口声明全部不生成对应的lua代码。

## 关于类型强转的处理(TSTypeAssertion)
由于lua没有类型的概念，为方便，所有类型强转全部不生成对应的lua代码。

## for循环的处理
对于常见的ts for循环，最直接与之对应的应该是lua的for的循环。但为了确保转换结果“总是”正确的，for循环总是转化为repeat...until结构。

## 以下语句不生成对应lua代码
* ExportDefaultDeclaration - 默认导出声明。
* TSDeclareFunction - 函数声明。
* TSTypeParameterDeclaration - 泛型参数。

## 以下语句不进行处理
* 正则表达式。
* 使用了自增/自减的复杂语句，比如`a = b++`、`a = arr[b++]`等。
* lua不支持的操作符，比如`in`。
* 使用中文作为key的Object。
* TypeScript中一些常用的方法，比如`split`、`indexOf`等。

## 关于xlua模式的说明
xlua模式下，会针对xlua规范对生成的lua代码进行处理：
* `UnityEngine.XXX`将会转换为`CS.UnityEngine.XXX`
* `UnityEngine.XXX.GetType()`将会被转换为`typeof(CS.UnityEngine.XXX)`


## 注意
ts2lua可以将TypeScipt代码转化为lua代码并尽可能保证转换完成后代码的正确性。由于语法之间的差异性，部分难以使用通用规则进行转换的语句，ts2lua将在可能有疑义的地方加上以`-[ts2lua]`标记开头的注释，以便提示您进行手动确认。建议转化完成后全局搜索`[ts2lua]`一一确认。

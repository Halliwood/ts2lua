# ts2lua
ts2lua是一个将TypeScript代码转换为lua代码的工具。在使用之前，建议您先阅读[lua-objects](https://github.com/dmccuskey/lua-objects "lua-objects的Github")，它是一个很不错的lua面向对象解决方案，支持多重继承、getter/setter等，ts2lua按照lua-objects的规范来处理TypeScript类。

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

其中，必选参数`inputPath`和`outputPath`分别表示TypeScript文件目录和生成的lua文件目录。可选参数`option`表示转换选项，当前支持如下选项：

```TypeScript
export interface TranslateOption {
  /**生成lua代码文件后缀名，默认为'.lua' */
  ext?: string, 
  /**lua代码风格，默认适配xlua */
  style?: 'xlua' | null, 
  /**是否在生成的lua代码中，增加ts2lua认为有必要人工处理的提示，默认为true */
  addTip?: boolean,
  /**函数名替换配置json文件路径，默认为lib\\func.json */
  funcReplConfJson?: string, 
  /**正则表达式替换配置txt文件路径，默认为lib\\regex.txt */
  regexReplConfTxt?: string, 
  /**对于没有替换配置的正则表达式，是否尝试简单翻译成lua，默认false。如果为true，则将正则表达式翻译为字符串，将转义符翻译成%。 */
  translateRegex?: boolean,
  /**输出未识别的正则表达式的文件路径，默认不输出 */
  traceUnknowRegex?: string
}
```

*可选字段`ext`表示生成lua文件后缀，比如可以指定为`.lua.txt`。
*可选字段`style`表示生成lua代码的风格，默认是xlua风格，ts2lua会按照xlua的一些规范生成对应的lua代码，详细见下方说明。如果不使用xlua风格，请设置`style`为`null`，如下所示：

```JavaScript
ts2lua.translateFiles('in', 'out', { style: null });
```

* 可选字段`addTip`默认为true，当ts2lua遇到无法确定转换结果100%效果一致时，将在代码中插入必要的提示。比如数组下标访问、正则表达式处理等。
* 可选字段`funcReplConfJson`表示用于配置函数名转换规则的json文件的存放路径。ts2lua将根据该文件的映射关系对指定的函数名进行翻译，你可以直接修改默认配置`lib\\func.json`。比如，`replace`函数将默认翻译为`gsub`。
* 可选字段`regexReplConfTxt`表示用于配置正则表达式转换规则的txt文件的存放路径。ts2lua将根据该文件的映射关系对指定的正则表达式进行翻译，你可以直接修改默认配置`lib\\regex.txt`。
* 可选字段`translateRegex`若为`true`，则对于正则表达式转换规则json文件中没有配置的正则表达式，ts2lua将简单的进行处理：将正则表达式翻译为字符串，将转义符翻译成%。比如`/\w+/g`将翻译成`'%w+'`。该字段默认为`false`，即原样输出（对lua来说，通常会有语法错误）。
* 可选字段`traceUnknowRegex`表示未识别正则表达式的输出路径。若指定了该值，则对于正则表达式转换规则json文件中没有配置的正则表达式，ts2lua将记录到一个文件中，方便集中处理后加入到转换配置中。
* 可选字段`ignoreNoUsedExp`若为`true`，则ts2lua会忽略代码块（`BlockStatement`）中没有实际用途的表达式（包括多余的成员表达式`MemberExpression`和标识`Identifier`访问）。该字段默认为`true`。如下述代码中多余的语句将被忽略：

TypeScript
```TypeScript
doStr() {
  let idx = 2;
  this.myArr;  // 这句是多余的MemberExpression
  idx;  // 这句是多余的Identifier
  console.log('idx == ' + idx);
}
```

lua
```lua
function doStr()
  local idx = 2
  print('idx == ' .. idx)
end
```


## 关于变量名、函数名不符合lua规范的处理
如果变量名、函数名为lua关键字，则自动添加`tsvar_`的前缀。如果包含`$`等lua不支持的字符，则自动将`$`替换为`tsvar_`。

## 关于单个ts文件中存在多个类定义的处理
TypeScript允许在单个ts文件中定义多个类，lua其实也可以这么写。但是为了避免循环引用的问题，最好的做法是将每个“类”定义在单独的文件里。ts2lua采用了这一策略。比如，在`module/something/Thing.ts`中定义了类`ThingB`，ts2lua会将`ThingB`生成到`module/something/Thing/ThingB.lua`中。

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
function doStr()
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

## 三元表达式的处理
`a ? b : c`将转换为`(a and {b} or {c})[1]`。

## 关于正则表达式的处理
由于lua不适用POSIX规范的正则表达式，因此写法上与TypeScript存在很多的差异和限制。部分TypeScript正则表达式的特效并无法简单地在lua中实现，比如lookahead和lookbehind。因此ts2lua不对正则表达式进行处理，在生成lua代码时插入如下注释，请搜索该注释并手动处理。

## 关于接口的处理(TSInterfaceDeclaration)
由于lua没有类型的概念，为方便，所有接口声明全部不生成对应的lua代码。

## 关于类型强转的处理(TSTypeAssertion)
由于lua没有类型的概念，为方便，所有类型强转全部不生成对应的lua代码。

## for循环的处理
对于常见的ts for循环，最直接与之对应的应该是lua的for的循环。但为了确保转换结果“总是”正确的，for循环总是转化为repeat...until结构。

## in操作符的处理
`A in B`将转换为`B[A]`。

## 以下语句不生成对应lua代码
* ExportDefaultDeclaration - 默认导出声明。
* TSDeclareFunction - 函数声明。
* TSTypeParameterDeclaration - 泛型参数。

## 以下语句不进行处理
* 正则表达式。
* 使用了自增/自减的复杂语句，比如`a = b++`、`a = arr[b++]`等。
* 使用中文作为key的Object。
* TypeScript中一些常用的方法，比如`split`、`indexOf`等。

## 关于xlua模式的说明
xlua模式下，会针对xlua规范对生成的lua代码进行处理：
* `UnityEngine.XXX`将会转换为`CS.UnityEngine.XXX`
* `UnityEngine.XXX.GetType()`将会被转换为`typeof(CS.UnityEngine.XXX)`


## 注意
ts2lua可以将TypeScipt代码转化为lua代码并尽可能保证转换完成后代码的正确性。由于语法之间的差异性，部分难以使用通用规则进行转换的语句，ts2lua将在可能有疑义的地方加上以`-[ts2lua]`标记开头的注释，以便提示您进行手动确认。建议转化完成后全局搜索`[ts2lua]`一一确认。如果你不需要生成提示，可为选项`addTip`传递`false`关闭提示。

ts2lua是一个正在开发中的工具，包括以下内容：
* updateexpression
* push(1, 2, 3)
* new Array()
* new Array(n)
* [1, 2, 3, 4]
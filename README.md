# ts2lua
Change typescript to lua.

## 关于类成员变量、临时变量声明的处理
TypeScript类中定义的成员变量的声明，如果没有在声明时进行初始化，则直接忽略，不会生成相关的lua代码。同理，临时变量也是一样。

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
由于lua没有自增/自减运算符，所以类似`A++`会处理成`A = A + 1`。不可避免地，由于语法之间的差异，比如TypeScript的语句`myArr[A++]`会被处理成`myArr[A = A + 1`，这在lua中是错误的。对于类似情况，ts2lua的转化结果可能不正确，需要手动处理。

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

## 关于正则表达式的处理
由于lua不适用POSIX规范的正则表达式，因此写法上与TypeScript存在很多的差异和限制。部分TypeScript正则表达式的特效并无法简单地在lua中实现，比如lookahead和lookbehind。因此ts2lua不对正则表达式进行处理，在生成lua代码时插入如下注释，请搜索该注释并手动处理。

## 关于接口的处理(TSInterfaceDeclaration)
由于lua没有类型的概念，为方便，所有接口声明全部不生成对应的lua代码。

## 关于类型强转的处理(TSTypeAssertion)
由于lua没有类型的概念，为方便，所有类型强转全部不生成对应的lua代码。

## for循环的处理
对于常见的ts for循环，最直接与之对应的应该是lua的for的循环。但为了确保转换结果“总是”正确的，for循环总是转化为repeat...until结构。

## 需要手动处理的代码
* ExportDefaultDeclaration - 默认导出声明
* TSDeclareFunction - 函数声明
* TSTypeParameterDeclaration - 泛型参数

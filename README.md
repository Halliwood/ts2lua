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

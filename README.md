# ts2lua
Change typescript to lua.

## 数组下标访问的处理
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

## for循环的处理
对于常见的ts for循环，最直接与之对应的应该是lua的for的循环。但为了确保转换结果“总是”正确的，for循环总是转化为repeat...until结构。

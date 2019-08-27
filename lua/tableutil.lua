table.merge = function(a, b)
  local c = {}
  local flag
  
  for k,v in pairs(a) do
    flag = false
    for key,value in pairs(c) do
      if value == v then
        flag = true
      end
    end
    if flag == false then
      table.insert(c,v)
    end
  end
  
  if b then
    for k,v in pairs(b) do
      flag = false
      for key,value in pairs(c) do
        if value == v then
          flag = true
        end
      end
      if flag == false then
        table.insert(c,v)
      end
    end
  end

  return c
end
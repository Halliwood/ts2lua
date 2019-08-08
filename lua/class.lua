Class = {};
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
end
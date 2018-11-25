
local ABC = "FIRST"--[[string]] or "SECOND"--[[string]] and "THIRD"--[[string]]

--[[
local func1: () => ()													= () => {}
local func2: () => number												= () => 123
local func3: () => (number)												= () => (123)
local func4: arg1 => (1,2,3)											= arg1 => (1,2,3)
local func5: (arg1) => ()												= (arg1) => ()
local func6: (arg1, arg2: number) => number								=  (arg1, arg2: number) => 123
local func7: (arg1, arg2: number, ...: number[]) => (number)			= (arg1, arg2: number, ...: number[]) => (123)
local func8: (arg1: string) => (1,2,3)									= (arg1: string) => (1,2,3)
local func9: (arg1: string, arg2) => (number | string & 123, 456)		= (arg1: string, arg2) => {
		print('This is a whole block!');
		return 123, 456;
	}
local func10 = () => do return 123, 456 end

local funcWrongType: () => number = () => true;

local a: 'abc' = 'def';

local b: number | string & Something;
--]]





















function test(par, ...)
	print(par, ...--[[string[]...]])
	return"abc"--[[string]], nil--[[null]], ...--[[string[]...]]
end--[[test(par: string) => (string, null, string[]...)]]

function test2(abc)
	if abc then
		return 123--[[number]]
	end
	return"abc"--[[string]]
end--[[test2(abc: any) => (number | string)]]

local a--[['not abc']] = "abc"--[[string]]
local b--[[string]] = 123--[[number]]

do local __class = setmetatable({}, { __call = function(_, ...) local self = setmetatable({}, setmetatable({ __index = test }, { __index = test })) return _.__ctor and _.__ctor(self, ...) or self end });test = __class;
	
	function __class:testMethod()
		print("hi"--[[string]])
		return"abc"--[[string]]
	end--[[testMethod() => (string)]]
	
	function __class:__tostring()
		return self.something
	end--[[__tostring() => (any)]]
	
	function __class.__ctor(self, msg)
		self.something = msg
		print("construct test class"--[[string]])
	end--[[__ctor(self: any, msg: string) => ()]]

end

do local __class = setmetatable({}, { __index = test, __call = function(_, ...) local self = setmetatable({}, setmetatable({ __index = inheritance }, { __index = inheritance })) return _.__ctor and _.__ctor(self, ...) or self end });inheritance = __class;
	
	function __class:testMethod()
		print("ret"--[[string]], base.testMethod(self))
		return"def"--[[string]]
	end--[[testMethod() => (string)]]

end

local obj = inheritance("heyo mayo"--[[string]])
print(obj)
print(type(obj))
print(obj:testMethod())
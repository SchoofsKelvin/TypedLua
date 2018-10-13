
local ABC--[[any]] = "FIRST"--[[string]] or "SECOND"--[[string]]--[[string]] and "THIRD"--[[string]]

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
--]]--[[string]]

local a--[[any]] = function(idk)return idk--[[any]] + 123--[[number]]--[[any]]end--[[(idk: number) => (any)]]

local function test--[[any]](par, ...)
	print--[[any]](par--[[any]], ...--[[string[]...]])
	return"abc"--[[string]], nil--[[null]], ...--[[string[]...]]
end--[[test(par: string) => (string, null, string[]...)]]

local function test2--[[any]](abc)
	if abc--[[any]]then
		return 123--[[number]]
	end
	return"abc"--[[string]]
end--[[test2(abc: any) => (number | string)]]

local a--[['not abc']] = "abc"--[[string]]
local b--[[string]] = 123--[[number]]
local c--[[string]] = "idk"--[[string]]
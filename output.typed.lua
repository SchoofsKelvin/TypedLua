
local ABC = "FIRST"--[[string]] or "SECOND"--[[string]] and "THIRD"--[[string]]


local func1--[[() => ()]] = function()end
local func2--[[() => (number)]] = function()return 123--[[number]]end
local func3--[[() => (number)]] = function()return 123--[[number]]end
local func4--[[(arg1: any) => (1, 2, 3)]] = function(arg1)return 1--[[number]], 2--[[number]], 3--[[number]]end
local func5--[[(arg1: any) => ()]] = function(arg1)end
local func6--[[(arg1: any, arg2: number) => (number)]] = function(arg1, arg2)return 123--[[number]]end
local func7--[[(arg1: any, arg2: number, ...: number[], ...: number[]) => (number)]] = function(arg1, arg2, ...)return 123--[[number]]end
local func8--[[(arg1: string) => (1, 2, 3)]] = function(arg1)return 1--[[number]], 2--[[number]], 3--[[number]]end
local func9--[[(arg1: string, arg2: any) => (number | string & 123, 456)]] = function(arg1, arg2)
	print("This is a whole block!"--[[string]])
	return 123--[[number]], 456--[[number]]
end
local func10 = function()return 123--[[number]], 456--[[number]]end

local funcWrongType--[[() => (number)]] = function()return true--[[true]]end

local a--[['abc']] = "def"--[[string]]

local b--[[number | string & any]]

function test(par, ...)
	print(par, ...)
end
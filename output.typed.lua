
local ABC = "FIRST" or "SECOND" and "THIRD"


local func1 = function()end
local func2 = function()return 123 end
local func3 = function()return 123 end
local func4 = function(arg1)return 1, 2, 3 end
local func5 = function(arg1)end
local func6 = function(arg1, arg2)return 123 end
local func7 = function(arg1, arg2, ...)return 123 end
local func8 = function(arg1)return 1, 2, 3 end
local func9 = function(arg1, arg2)
	print("This\32is a whole block!")
	return 123, 456
end
local func10 = function()return 123, 456 end

local a = "def"

local b

function test(par, ...)
	print(par, ...)
end
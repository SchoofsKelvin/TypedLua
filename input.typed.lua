
local ABC = "FIRST" or "SECOND" and "THIRD"


local func1: () => ()
local func2: () => number
local func3: () => (number)
local func4: () => (1,2,3)
local func5: (arg1) => ()
local func6: (arg1, arg2: number) => number
local func7: (arg1, arg2: number, ...: number[]) => (number)
local func8: (arg1: string) => (1,2,3)
local func9: (arg1: string, arg2) => (number | string & 123, 456)


local a: 'abc' = 'def';

local b: number | string & Something;

function test(par: string, ...: string[])
	print(par, ...)
end

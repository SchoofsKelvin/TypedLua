
local ABC = "FIRST" or "SECOND" and "THIRD"

--[==[
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
--]==]

local a = (idk: number) => (idk + 123);
a(123)
a('hi')

function test(par: string, ...: string[]): (number, 123)
	print(par, ...)
	return 'abc', nil, ...
end

test('abc')
test('abc', 'def', 'ghi')
test(123)
test('abc', 'def', 123)

function test2(abc)
	if abc then
		return 123
	end
	return 'abc';
end

local a: 'not abc' = 'abc';
local b: string = 123;
local c: string = 'idk';

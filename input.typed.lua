
local a: 'abc' = 'def';

local b: number | string & Something;

function test(par: string, ...: string[])
	print(par, ...)
end

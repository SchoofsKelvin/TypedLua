
--[[ a]]
--[[ b]]
--[[c]]


print("hi")
print("hi")

A = 123

local function a(p1, p2, ...)
	print('b')
end
local function a()
	print('b')
	a, b = 1, 2, 3
end

--[[ LOGGING ]]--[[]]


local TostringValue, TupleToString, List, pprint = do
	local tostring, pcall = tostring, pcall
	local function doPathKey(key)
		if type(key) == "string" and key:find("^[%a_][%w_]*$")then
			return'.' .. key
		end return'[' .. TostringValue(key, true) .. ']'
	end local prims = {["boolean"] = true["number"] = true["string"] = true["userdata"] = true}
	function TostringValue(val, short, tab, inline)
		tab = tab or 0
		local typ = type(val)
		local tss, ts = pcall(tostring, val)
		ts = tss and ts or "\60tostring errored>"
		if type(ts) ~= "string"then return"__tostring_returned_non_string"end
		local realpre = ("\32   "):rep(tab)
		local prefix = inline and "" or realpre
		short = short or {["path"] = {"root"}}
		if typ == "string"then
			return prefix .. ("%q"):format(val)
		elseif
			return prefix .. ts then
		elseif
			if short == true then return prefix .. ts end
			if short[val]then return prefix .. short[val]end
			short[val] = table concat(short path)
			local pc, ipc, prim = 0, 0, true
			for k, v in pairs(val) do
				pc, prim = pc + 1, prim and prims[type(k)] and prims[type(v)]
			end
			for k, v in ipairs(val) do
				ipc, prim = ipc + 1, prim and prims[type(k)] and prims[type(v)]
			end if pc == 0 then return prefix .. "{}"end
			local idk, pre = {}, ("\32   "):rep(tab + 1)
			local bigsep = prim and "" or '\n'
			local sep = prim and ',' or ';'
			for i = 1, ipc do
				idk[i] = TostringValue(val[i], short, prim and 0 or tab + 1) .. sep .. bigsep
			end if ipc ~= 0 and prim then idk[ #idk] = idk[ #idk]:sub(1,  -2)end
			local row = (prim and "" or pre) .. "[%s]\32= %s" .. sep .. bigsep
			for k, v in pairs(val) do
				if type(k) ~= "number" or type(k) == "number" and k > ipc then
					local key = TostringValue(k, true)short path[ #short path + 1] = doPathKey(k)
					table insert(idk, row:format(key, TostringValue(v, short, prim and 0 or tab + 1, true)))
					short path[ #short path] = nil
				end
			end if pc - ipc ~= 0 and prim and idk[1]then idk[ #idk] = idk[ #idk]:sub(1,  -2)end
			return prefix .. '{' .. bigsep .. table concat(idk) .. (prim and "" or realpre) .. '}'then
		elseif
			return prefix .. (val Parent and val:GetFullName() or "Instance\32" .. ts)then
		
		
		else return prefix .. typ .. '\32' .. ts end
	end
	function TupleToString(...)
		local res = {...}
		for i = 1, select('#', ...) do
			res[i] = TostringValue(res[i])
		end return table concat(res, ",\32")
	end
	function List(tab)print()
		for k, v in pairs(tab) do
			print("-\32[" .. TostringValue(k, true) .. "]\32=", TostringValue(v, true) .. ';')
		end
	end
	local function path()
		local res, trace = {}, debug traceback()
		for line in trace:gmatch("[^\n]+") do
			local ln, fn = line:match("(%d+):\32in function '(%w+)'")
			if ln and tonumber(ln) > 100 then
				res[ #res + 1] = fn
			elseif
				res[ #res + 1] = "..."then
			end
		end trace = {}
		for i = 1,  #res do
			trace[i] = res[ #res - i + 1]
		end return table concat(trace, '\62')
	end
	local function level()
		for i = 1, 200 do
			if N debug getinfo(i)then
				return i
			end
		end
	end
	BLOCKS = 0
	function pprint(...)
		print('[' .. level() .. '|' .. BLOCKS .. ']', TupleToString(...))
	end
end

function a()
	out:write()
end

local function cprint(txt, col, maxl)
	local out = io open("out.ps1", 'w')
	local ln, nl = 1
	txt = txt:gsub('\n', "\32\n")
	for line in txt:gmatch("[^\n]+") do
		if maxl and ln > maxl then break end
		if nl then out:write("write-host\n")end nl = true
		line = line:gsub('"', "96\"")ln = ln + 1
		if line == '\32'then line = ""end
		out:write("write-host\32-NoNewline -Background " .. col .. "\32\"" .. line .. "\"\n")
	end
	out:close()
	os execute("powershell\32-ExecutionPolicy Bypass -File out.ps1")
	--[[os.execute("powershell write-host -NoNewline -foreground "..col.." "..test)]]
end

local function splitprint(txt, i)
	local begin, lns = txt:sub(1, i - 1), {}
	for line in begin:gmatch("[^\n]+") do
		lns[ #lns + 1] = line
	end begin = table concat(lns, '\n', math max( #lns - 5, 1))
	cprint(begin, "darkgreen" or "green")
	cprint(txt:sub(i), "darkred" or "red", 3)print()
end

--[[ PARSER ]]--[[]]

local function map(tab)
	local res = {}
	for i = 1,  #tab do
		res[tab[i]] = true
	end return res
end

local Keywords = map({
"do""end""while""repeat""until"
"if""then""elseif""else""for""in"
"function""local""return""break"
"false""true""nil""not""and""or"})


local Binops, BinopsPriority = {
'+''-''*''/''^''%'".."
"\60="'\60'"\62="'\62'"\61=""~\61"}, 
{
['^'] = 1
--[[ unary operators = 2]]
['*'] = 3['/'] = 3['%'] = 3
['+'] = 4['-'] = 4
[".."] = 5
['\60'] = 6["\60="] = 6['\62'] = 6["\62="] = 6["\61="] = 6["~\61"] = 6
--[[ or/and = 7]]}


local Parser = {}
function Parser new(str)
	local lines = {1}
	for i = 1,  #str do
		if str:byte(i, i) == 10 then
			lines[ #lines + 1] = i + 1
		end
	end
	local res = {["str"] = str['i'] = 1["lines"] = lines}
	for k, v in pairs(Parser) do
		res[k] = v
	end return res
end

--[[ Parser stuff]]do
	function Parser Line(i)
		i = i or self i
		local lines = self lines
		for line =  #lines, 1,  -1 do
			local start = lines[line]
			if start <= i then
				return line i - start + 1
			end
		end error()
	end
	function Parser Peek(func, ...)
		local old = self i
		return self[func](self, ...)old
	end
	function Parser ActualTrim()
		local a, b = self str:find("%s+", self i)
		if a ~= self i then return self i true end
		b = b + 1 self i = b return b false
	end
	function Parser Comment()
		self:ActualTrim()
		local eq = self:Match("%-%-%[\61*%[", true)
		if eq then
			local start = self:Line()
			eq = string rep('\61',  #eq - 4)
			local start, stop = self:Find(']' .. eq .. ']', true)
			assert(start, "unfinished\32long comment starting at line " .. start)
			self i = stop + 1 return true
		elseif
			local p = self:Find('\n', true)
			if N p then return end
			self i = p + 1 return true then
		end
	end
	function Parser Trim()
		while self:Comment()do end
		return self:ActualTrim()
	end
	function Parser String(str, noTrim)
		local i = noTrim and self i or self:Trim()
		if self str:sub(i, i +  #str - 1) == str then
			self i = i +  #str return str
		end
	end
	function Parser Match(pat, noTrim)
		local i = noTrim and self i or self:Trim()
		local a, b = self str:find(pat, i)
		if a == i then
			self i = b + 1
			return self str:sub(a, b)
		end
	end
	function Parser Find(pat, plain)
		return self str:find(pat, self i, plain)
	end
	function Parser Keyword(word)
		local i, str = self:Trim(), self str
		local a, b = str:find("%w+", i)
		if a == i then
			local found = str:sub(a, b)
			if found == word then
				self i = b + 1 return found
			elseif
				self i = b + 1 return found then
			end
		end
	end
end

--[[ Error handling]]do
	function Parser Assert(cond, err, ...)
		if cond then return end
		err = err:gsub("%%l", self:Line())
		error(err:format(...))
	end
end

--[[ Syntax structs
	Scope {
		Parent = Scope
		Locals = Local[]
		Upvalues = Upvalue[]
	}
	Chunk {
		Block = Stat[]
		Scope = Scope
	}
	FuncBody : Chunk {
		Block = Stat[]
		Parameters = <name>[]
	}
	Stat {
		Line = <number>
		Type = <statType>
		<statType-specific fields>
	}
	
	Stat types:
		Vararg {}
		Break {}
		Return {
			Expressions = Expression[]
		}
		Variable {
			Scope = Scope;
			ScopePosition = <number>
			Name = <name>
		}
		Field {
			Name = <name>			-- THIS OR
			Expression = Expression	-- THIS
			Base = Expression
		}
		Method {
			Name = <name>
			Base = Expression
		}
		Do {
			Block = Stat[]
		}
		While {
			Block = Stat[]
			Condition = Expression
		}
		Repeat {
			Block = Stat[]
			Condition = Expression
		}
		If {
			Blocks = {Expression,Stat[]}[]
			Otherwise = Stat[]
		}
		NumericFor {
			Block = Stat[]
			Name = <name>
			Var = Expression
			Limit = Expression
			Step = Expression/nil
		}
		GenericFor {
			Block = Stat[]
			Names = <name>[]
			Expressions = Expression[]
		}
		Assignment {
			Variables = Expression[] (Variable/Field)
			Expressions = Expression[]
			Locals = <true/nil>
		}
		UnaryOp {
			Operation = <unop>
			Priority = 2
			Expression = Expression
		}
		BinaryOp {
			Operation = <binop>
			Priority = <priority>
			Left = Expression
			Right = Expression
		}
		FunctionCall {
			--Method = <boolean>
			Target = Expression
			Arguments = Expression[]
		}
		FunctionSelfCall {
			Name = <name>
			Base = Expression
			Arguments = Expression[]
		}
		Brackets {
			Expression = Expression
		}
		Constant {
			Value = <string/number/boolean/nil>
		}
		Table {
			Content = {Key=Expression/nil,Value=Expression}[]
		}
		Function {
			Chunk = Chunk
			Parameters = <name>[]
			Variable = Variable/Field/Method/<nil>
			Local = <true/nil>
		}
]]













































































































--[[ Syntax parsing]]do
	function Parser Block()
		BLOCKS = BLOCKS + 1
		local scope = {
		["Parent"] = self scope
		["Locals"] = {}
		["Upvalues"] = {}}
		
		self scope = scope
		local stats = {}
		local prev = self block
		self block = stats
		local stat, last = self:Stat()
		while stat do
			stats[ #stats + 1] = stat
			self:String(';')
			if last then break end
			stat, last = self:Stat()
		end
		if self:Keyword("break")then
			stats[ #stats + 1] = {
			["Line"] = self:Line()
			["Type"] = "Break"}
		
		elseif
			local start = self:Line()
			stats[ #stats + 1] = {
			["Line"] = start
			["Type"] = "Return"
			["Expressions"] = self:Explist() or {}}then
		
		end
		self block = prev
		self scope = scope Parent
		BLOCKS = BLOCKS - 1
		return stats scope
	end
	function Parser Chunk()
		local chunk = {}
		self base = self base or chunk
		local prev = self chunk
		self chunk = chunk
		chunk Block, chunk Scope = self:Block()
		self chunk = prev
		return chunk
	end
	function Parser Parse()
		local ch = self:Chunk()
		assert(self i >  #self str, "Unexpected\32symbol")
		return ch
	end
	--[[
	stat ::=
		varlist `=� explist | 
		functioncall | 
		do block end | 
		while exp do block end | 
		repeat block until exp | 
		if exp then block {elseif exp then block} [else block] end | 
		for Name `=� exp `,� exp [`,� exp] do block end | 
		for namelist in explist do block end | 
		function funcname funcbody | 
		local function Name funcbody | 
		local namelist [`=� explist] 
	]]
	
	
	
	
	
	
	
	
	
	
	
	
	
	function Parser Functionname()
		local start = self:Line()
		local name = self:Name()
		assert(name, "Expected\32a name")
		local expr = {
		["Line"] = start
		["Type"] = "Variable"
		["Scope"] = self scope
		["ScopePosition"] =  #self scope Locals
		["Name"] = name}
		
		while self:String('.')do
			name = self:Name()
			assert(name, "Expected\32a name")
			expr = {
			["Line"] = start
			["Type"] = "Field"
			["Name"] = name
			["Base"] = expr}
		
		end
		if self:String(':')then
			name = self:Name()
			assert(name, "Expected\32a name")
			expr = {
			["Line"] = start
			["Type"] = "Method"
			["Name"] = name
			["Base"] = expr}
		
		end return expr
	end
	function Parser Stat()
		local keyword, old = self:Peek("Keyword")
		local start = self:Line()
		if keyword == "do"then
			local block = self:Block()
			assert(self:Keyword("end"), "Expected\32`end` to close `do` (line " .. start .. ')')
			return{
				["Line"] = start
				["Type"] = "Do"
				["Block"] = block}
		
		elseif
			local expr = self:Expression()
			assert(self:Keyword("do"), "Expected\32`do`")
			local block = self:Block()
			assert(self:Keyword("end"), "Expected\32`end` to close `while` (line " .. start .. ')')
			--[[self.block[#self.block+1] = ]]
			return{
				["Line"] = start
				["Type"] = "While"
				["Condition"] = expr
				["Block"] = block}then
		
		elseif
			local block = self:Block()
			assert(self:Keyword("until"), "Expected\32`until` to close `repeat` (line " .. start .. ')')
			local expr = self:Expression()
			self block[ #self block + 1] = {
			["Line"] = start
			["Type"] = "Repeat"
			["Condition"] = expr
			["Block"] = block}then
		
		elseif
			local expr = self:Expression()
			assert(expr, "Expected\32an expression")
			assert(self:Keyword("then"), "Expected\32`then`")
			local blocks = {{expr(self:Block())}}
			while self:Keyword("elseif")do
				expr = self:Expression()
				assert(expr, "Expected\32an expression")
				assert(self:Keyword("then"), "Expected\32`then`")
				blocks[ #blocks + 1] = {expr(self:Block())}
			end local otherwise = 
			if self:Keyword("else")then
				otherwise = self:Block()
			end
			assert(self:Keyword("end"), "Expected\32`end` to close `if` (line " .. start .. ')')
			--[[self.block[#self.block+1] = ]]
			return{
				["Line"] = start
				["Type"] = "If"
				["Blocks"] = blocks
				["Otherwise"] = otherwise}then
		
		elseif
			local names = self:Namelist()
			assert(names, "Expected\32a name")
			if #names == 1 and self:String('\61')then
				local var = self:Expression()
				assert(var, "Expected\32an expression")
				assert(self:String(','), "Expected\32a `,`")
				local limit = self:Expression()
				assert(limit, "Expected\32an expression")
				local step = 
				if self:String(',')then
					step = self:Expression()
					assert(step, "Expected\32an expression")
				end
				assert(self:Keyword("do"), "Expected\32`do`")
				local block = self:Block()
				assert(self:Keyword("end"), "Expected\32`end` to close `for` (line " .. start .. ')')
				return{
					["Line"] = start
					["Type"] = "NumericFor"
					["Block"] = block
					["Name"] = names[1]
					["Var"] = var
					["Limit"] = limit
					["Step"] = step}
			
			end
			assert(self:Keyword("in"), "Expected\32`in`")
			local exprs = self:Explist()
			assert(exprs, "Expected\32an expression")
			assert(self:Keyword("do"), "Expected\32`do`")
			local block = self:Block()
			assert(self:Keyword("end"), "Expected\32`end` to close `for` (line " .. start .. ')')
			return{
				["Line"] = start
				["Type"] = "GenericFor"
				["Block"] = block
				["Names"] = names
				["Expressions"] = exprs}then
		
		elseif
			local name = self:Functionname()
			assert(name, "Expected\32a name")
			local func = self:Funcbody()
			--[[func.Variable = {
				Line = start;
				Type = "Variable";
				Scope = self.scope;
				ScopePosition = #self.scope.Locals;
				Name = name;
			}]]
			
			
			
			
			
			
			func Variable = name
			if name Type == "Method"
			--[[table.insert(func.Parameters,1,"self")]]then
				table insert(func Chunk Scope Locals, 1, "self")
			end
			--[[self.block[#self.block+1] = func]]
			return func then
		elseif
			if self:Keyword("function")then
				local name = self:Name()
				assert(name, "Expected\32a name")
				local locals = self scope Locals
				locals[ #locals + 1] = name
				local func = self:Funcbody()
				func Variable = {
				["Line"] = start
				["Type"] = "Variable"
				["Scope"] = self scope
				["ScopePosition"] =  #self scope Locals
				["Name"] = name}
				
				func Local = true
				--[[self.block[#self.block+1] = func]]
				return func
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			else local vars, exprs = self:Namelist()assert(vars, "Expected\32a name")if self:String('\61')then exprs = self:Explist()end local locals = self scope Locals for i = 1,  #vars do local name = vars[i]vars[i] = {["Line"] = start["Type"] = "Variable"["Name"] = name["Scope"] = self scope["ScopePosition"] =  #self scope Locals}locals[ #locals + 1] = name end return{["Line"] = start["Type"] = "Assignment"["Variables"] = vars["Expressions"] = exprs or {}["Locals"] = true}end error("hi")
			--[[if not keyword then]]then
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		else self i = old local expr, o = self:Peek("Expression")if expr and (expr Type == "FunctionCall" or expr Type == "FunctionSelfCall")then return expr end self i = o local vars = self:Varlist()if vars then assert(self:String('\61'), "Expected\32`=`")local exprs = self:Explist()assert(exprs, "Expected\32an expression")return{["Line"] = start["Type"] = "Assignment"["Variables"] = vars["Expressions"] = exprs}end self i = o end
		self i = old
	end
	function Parser CheckBinop(expr)
		local left = expr Left
		if left Priority then
			if left Priority < expr Priority then
			
			end
		end
		return self:PostExpression(expr)
	end
	local IsPrefix = {
	["Variable"] = true
	["Field"] = true
	["FunctionCall"] = true
	["FunctionSelfCall"] = true
	["Brackets"] = true}
	
	function Parser PostExpression(prev)
		local start = self:Line()
		local binop, old = self:Peek("Binop")
		local isPrefix = IsPrefix[prev Type]
		if binop then
			local right = self:Expression()
			assert(right, "Expected\32an expression")
			return self:CheckBinop({
				["Line"] = start
				["Type"] = "BinaryOp"
				["Operation"] = binop
				["Priority"] = BinopsPriority[binop]
				["Left"] = prev
				["Right"] = right})
		
		elseif
			assert(isPrefix, "Unexpected\32symbol `[`")
			start = self:Line()
			local expr = self:Expression()
			assert(expr, "Expected\32an expression")
			assert(self:String(']'), "Expected\32`]` to close `[` (line " .. start .. ')')
			return self:PostExpression({
				["Line"] = start
				["Type"] = "Field"
				["Expression"] = expr
				["Base"] = prev})then
		
		elseif
			assert(isPrefix, "Unexpected\32symbol `.`")
			local name = self:Name()
			assert(name, "Expected\32a name")
			return self:PostExpression({
				["Line"] = start
				["Type"] = "Field"
				["Name"] = name
				["Base"] = prev})then
		
		elseif
			assert(isPrefix, "Unexpected\32symbol `:`")
			local name = self:Name()
			assert(name, "Expected\32a name")
			return self:PostExpression({
				["Line"] = start
				["Type"] = "Method"
				["Name"] = name
				["Base"] = prev})then
		
		end
		local args = self:Args()
		if args then
			if prev Type == "Method"then
				return self:PostExpression({
					["Line"] = self:Line()
					["Type"] = "FunctionSelfCall"
					["Name"] = prev Name
					["Base"] = prev Base
					["Arguments"] = args})
			
			end
			assert(isPrefix, "Unexpected\32symbol")
			return self:PostExpression({
				["Line"] = self:Line()
				["Type"] = "FunctionCall"
				["Target"] = prev
				["Arguments"] = args})
		
		end return prev
	end
	function Parser Expression()
		local start = self:Line()
		if self:String('(')then
			local expr = self:Expression()
			assert(self:String(')'), "Expected\32`)` to close `(` (line " .. start .. ')')
			return self:PostExpression({
				["Line"] = start
				["Type"] = "Brackets"
				["Expression"] = expr})
		
		elseif
			return self:PostExpression({
				["Line"] = line
				["Type"] = "Vararg"})then
		
		elseif
			local func = self:Funcbody()
			return self:PostExpression(func)then
		end
		local op, o = self:Peek("Match", "[%-#]")
		op = op or self:Keyword("not")
		if op then
			local expr = self:Expression()
			assert(expr, "Expected\32an expression")
			return self:PostExpression({
				["Line"] = start
				["Type"] = "UnaryOp"
				["Operation"] = op
				["Expression"] = expr
				["Priority"] = 2})
		
		end self i = o
		local keyword = self:Keyword()
		if keyword == "nil"then
			return self:PostExpression({["Line"] = line["Type"] = "Constant"})
		elseif
			return self:PostExpression({["Line"] = line["Type"] = "Constant"["Value"] = true})then
		elseif
			return self:PostExpression({["Line"] = line["Type"] = "Constant"["Value"] = false})then
		end self i = o
		local number = self:Number()
		if number then return self:PostExpression(number)end
		local str = self:StringConstant()
		if str then return self:PostExpression(str)end
		local tab = self:Table()
		if tab then return self:PostExpression(tab)end
		local name, old = self:Peek("Name")
		if name then
			return self:PostExpression({
				["Line"] = start
				["Type"] = "Variable"
				["Name"] = name
				["Scope"] = self scope
				["ScopePosition"] =  #self scope Locals})
		
		end self i = old
	end
	local Setters = {
	["Field"] = true
	["Variable"] = true}
	
	function Parser Varlist()
		local var, o = self:Peek("Expression")
		if N var then self i = o return end
		if N Setters[var Type]then self i = o return end
		local res = {var}
		while self:String(',')do
			var = self:Expression()
			assert(var, "Expected\32a variable")
			assert(Setters[var Type], "Expected\32a variable/field")
			res[ #res + 1] = var
		end return res
	end
	function Parser Number()
		if self:String("0x")then
			local mat = self:Match("%w+")
			mat = tonumber(mat, 16)
			assert(mat, "Malformed\32number")
			return{
				["Line"] = self:Line()
				["Type"] = "Constant"
				["Value"] = mat}
		
		end
		local value = self:Match("%d+")
		if self:String('.', true)then
			local n = self:Match("%d+", true)
			value = (value or "") .. '.' .. n
		elseif
			return nil then
		end
		if self:Match("[eE]", true)then
			local n = self:Match("[%-%+]?%d+", true)
			assert(n, "Malformed\32number")
			value = value .. 'e' .. n
		end
		return{
			["Line"] = self:Line()
			["Type"] = "Constant"
			["Value"] = tonumber(value)}
	
	end
	local escapes = {['a'] = 'a'['b'] = '\8'['f'] = '\12'['n'] = '\n'['r'] = '\13'['t'] = '\t'['v'] = '\11'['\13'] = '\n'["\\"] = "\\\\"}
	local function escaped(str)
		str = str:gsub("\\(%d%d?%d?)", string char)
		return
			
			str:gsub("\\x(%d+%d+)", function(c)return string char(tonumber(c, 16))end):gsub("\\(.)", function(c)return escapes[c] or c end)
	end
	function Parser StringConstant()
		local q = self:Match("['\"]")
		if q then
			local pos, str, esc = self i, self str
			for i = pos,  #str do
				local c = str:sub(i, i)
				if esc then
					esc = nil
				elseif
					esc = true then
				elseif
					self i = i + 1
					esc = nil
					return{
						["Line"] = self:Line()
						["Type"] = "Constant"
						["Value"] = escaped(str:sub(pos, i - 1))}then
				
				end
			end
			error("Unfinished\32string")
		end
		q = self:Match("%[\61*%[")
		if N q then return end
		local eqs, pos = q:sub(2,  -2), self i
		local a, b = self:Find(']' .. eqs .. ']', true)
		self i = b + 1
		return{
			["Line"] = self:Line()
			["Type"] = "Constant"
			["Value"] = self str:sub(pos, a - 1)}
	
	end
	function Parser Binop()
		local kw = self:Keyword("and")
		kw = kw or self:Keyword("or")
		if kw then return kw 7 end
		for i = 1,  #Binops do
			local op = Binops[i]
			if self:String(op)then
				return op
			end
		end
	end
	function Parser Field()
		if self:String('[')then
			local start = self:Line()
			local key = self:Expression()
			assert(key, "Expected\32an expression")
			assert(self:String(']'), "Expected\32`]` to close `[` (line " .. start .. ')')
			assert(self:String('\61'), "Expected\32`=`")
			local val = self:Expression()
			assert(val, "Expected\32an expression")
			return{["Key"] = key["Value"] = val}
		end local name, old = self:Peek("Name")
		if name and self:String('\61')then
			local start = self:Line()
			local expr = self:Expression()
			assert(expr, "Expected\32an expression")
			return{
				["Key"] = {
				["Line"] = start
				["Type"] = "Constant"
				["Value"] = name}
				["Value"] = expr}
		
		end self i = old
		local expr = self:Expression()
		return expr and {["Value"] = expr}
	end
	function Parser Table()
		if N self:String('{')then return end
		local start = self:Line()
		local content, sep = {}, true
		local field = self:Field()
		while field do
			assert(sep, "Expected\32`,` or `;`")
			content[ #content + 1] = field
			sep = self:Match("[,;]")
			field = self:Field()
		end
		assert(self:String('}'), "Expected\32`}` to close `{` (line " .. start .. ')')
		return{
			["Line"] = start
			["Type"] = "Table"
			["Content"] = content}
	
	end
	function Parser Explist()
		local expr = self:Expression()
		if N expr then return end
		local res = {expr}
		while self:String(',')do
			expr = self:Expression()
			assert(expr, "Unexpected\32`,`")
			res[ #res + 1] = expr
		end
		return res
	end
	function Parser Args()
		local res = self:StringConstant()
		if res then return{res}end
		res = self:Table()
		if res then return{res}end
		if N self:String('(')then return end
		local start = self:Line()
		res = self:Explist()
		assert(self:String(')'), "Expected\32`)` to close `(` (line " .. start .. ')')
		return res or {}
	end
	function Parser Functioncall()
		local old = self i
		local prefix = self:Prefixexp()
		if N prefix then self i = old return end
		local methodname = 
		if self:String(':')then
			methodname = self:Name()
			assert(methodname, "Expected\32a name")
		end
		local args = self:Args()
		if N args then
			if prefix Arguments then
				return prefix
			end self i = old return
		end
		return{
			["Line"] = self:Line()
			["Type"] = "FunctionCall"
			["Target"] = prefix
			["Method"] = method
			["Arguments"] = args}
	
	end
	function Parser Name()
		local m, o = self:Peek("Match", "[_%a][_%w]*")
		if N m then return end
		if Keywords[m]then
			self i = o return
		end return m
	end
	function Parser Namelist(vararg)
		local name = self:Name()
		local names = {name}
		if name then
			while self:String(',')do
				if vararg and self:String("...")then
					names[ #names + 1] = "..."break
				end name = self:Name()
				assert(name, "Expected\32a name")
				names[ #names + 1] = name
			end return names
		end
	end
	function Parser Parlist()
		local namelist = self:Namelist(true)
		if namelist then
			if self:String(',')then
				assert(self:String("..."), "Expected\32`...`")
				namelist[ #namelist + 1] = "..."return namelist
			end return namelist
		elseif
			return{"..."}then
		end return{}
	end
	function Parser Funcbody()
		assert(self:String('('), "Expected\32`(`")
		local params = self:Parlist()
		assert(self:String(')'), "Expected\32`)`")
		local start = self:Line()
		local chunk = self:Chunk()
		--[[chunk.Parameters = params]]
		assert(self:Keyword("end"), "Expected\32`end` for function (line " .. start .. ')')
		return{
			["Line"] = start
			["Type"] = "Function"
			["Chunk"] = chunk
			["Parameters"] = params}
	
	end
end

function Parser Splitprint()
	splitprint(self str, self i)
end

if ... then return Parser end



--[[ TESTING ]]--[[]]

local source = io open("input.lua")
source = source:read("*a"), source:close()
print("Source:",  #source)

local parser = Parser new(source)
xpcall(function()
	local start = os clock()
	local res = parser:Parse()
	print("Took", os clock() - start, "to\32parse")
	local f = io open("output.lua", 'w')
	f:write(TostringValue(res))f:close()
end, function(e)
	print("ERROR:", e)
	print("stack\32traceback:")
	print(debug traceback():match(".-\n.-\10(.*)"))
	print("Position:", parser:Line())
	--[[cprint(parser.str:sub(1,parser.i-1),"green")]]
	--[[cprint(parser.str:sub(parser.i),"red",3)]]
end)

splitprint(parser str, parser i)
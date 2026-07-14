-- Warm per-paragraph daemon for Draft mode's instant path. The engine stays alive with
-- the preamble/fonts loaded; each request typesets ONE block into \box0 and walks the
-- finished box, so a keystroke costs ~1-2ms of TeX work instead of a full compile.
-- (Walking the finished box, not post_linebreak_filter, so display math is captured too.)
-- Engine dir comes from the TEXPILE_ENGINE_DIR global set in the injecting job string.
local walker = dofile((TEXPILE_ENGINE_DIR or ".") .. "/walker.lua")

local current, announced

local function readline()
	local l = io.stdin:read("*l")
	if l then l = l:gsub("\r$", "") end
	return l
end

local function respond(s)
	io.stdout:write("\n", s, "\n")
	io.stdout:flush()
end

function texd_step()
	if not announced then
		announced = true
		-- report the REAL column width (columnwidth, halved under twocolumn -- what
		-- constrains line breaking) and textheight, plus a capability probe.
		local c = walker.capabilities()
		respond(string.format(
			'@@CAP {"luatex":%s,"rev":%q,"effective_glue":%s,"rangedimensions":%s,"subtypes_api":%s}',
			tostring(c.luatex), tostring(c.rev), tostring(c.effective_glue),
			tostring(c.rangedimensions), tostring(c.subtypes_api)))
		local cw = tex.dimen["columnwidth"] or tex.dimen["textwidth"] or (345 * 65536)
		local th = tex.dimen["textheight"] or (550 * 65536)
		respond(string.format("@@READY %.4f %.4f", cw / 65536.0, th / 65536.0))
	end
	local hsize, want_glyphs, lines = "300", false, {}
	while true do
		local l = readline()
		if l == nil or l == "QUIT" then
			-- nil = stdin EOF = the app died; exiting here IS the orphan protection
			-- (verified: hard-killed parent reaps the daemon in <1s). Never loop on nil.
			tex.print("\\texdrun=0")
			return
		elseif l:match("^HSIZE ") then
			hsize = l:match("^HSIZE (%S+)")
		elseif l == "GLYPHS" then
			want_glyphs = true
		elseif l == "TEXT" then
			while true do
				local t = readline()
				if t == nil or t == "END" then break end
				lines[#lines + 1] = t
			end
			break
		end
	end
	current = { t0 = os.gettimeofday(), glyphs = want_glyphs }
	tex.print("\\setbox0\\vbox\\bgroup\\hsize=" .. hsize .. "pt\\noindent")
	for _, l in ipairs(lines) do tex.print(l) end
	tex.print("\\par\\egroup\\directlua{texd_emit()}")
end

function texd_emit()
	local dt = (os.gettimeofday() - current.t0) * 1000.0
	local ok, records, stats = pcall(walker.lines, tex.box[0].head)
	if ok then
		local unc = stats.uncertified and string.format(',"uncertified":%q', stats.uncertified) or ''
		respond(string.format('@@R {"ms":%.4f,"lines":%d,"glyphs":%d,"maxdev":%.4f,"certified":%s%s}',
			dt, stats.lines, stats.glyphs, stats.maxdev, tostring(stats.certified), unc))
		if current.glyphs then
			for _, r in ipairs(records) do respond("@@G " .. r) end
			respond("@@GEND")
		end
	else
		respond(string.format('@@R {"ms":%.4f,"lines":0,"glyphs":0,"error":%q}', dt, tostring(records)))
	end
	current = nil
end

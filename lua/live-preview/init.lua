local livePreviewHelper =require("live-preview/livePreviewHelper")
local M = {}

local groupName = "hostmyapps/LivePreview"
local autoGroup = nil
local isActive = false
local previewUrl = "http://localhost:8765"
local serverPid = nil
local debugEnabled = false
local logFile = vim.fn.stdpath("cache") .. "/live_preview.log"

local function log(msg)
	local f = io.open(logFile, "a")
	if f then
		f:write(os.date("[%Y-%m-%d %H:%M:%S] ") .. tostring(msg) .. "\n")
		f:close()
	end
end

local function logTable(tbl, indent)
	indent = indent or 0
	local prefix = string.rep("  ", indent)
	for k, v in pairs(tbl) do
		if type(v) == "table" then
			log(prefix .. tostring(k) .. " = {")
			logTable(v, indent + 1)
			log(prefix .. "}")
		else
			log(prefix .. tostring(k) .. " = " .. tostring(v))
		end
	end
end

local function dbg(msg)
	if debugEnabled then log(msg) end
end

-- systemübergreifend Browser öffnen
local function openBrowser()
	local cmd =
	vim.fn.has("mac") == 1 and { "open", previewUrl } or
	vim.fn.has("unix") == 1 and { "xdg-open", previewUrl } or
	vim.fn.has("win32") == 1 and { "cmd.exe", "/C", "start", previewUrl } or
	nil
	if cmd then
		vim.fn.jobstart(cmd, { detach = true })
	else
		print("[LivePreview] Plattform nicht unterstützt für Browser-Start.")
	end
end

local function closeBrowser()
	print("[LivePreview] Bitte den Browser-Tab manuell schließen.")
end

local function startServer()
	if serverPid ~= nil then return end
	local pluginPath = debug.getinfo(1, "S").source:sub(2):gsub("/init%.lua", "")
	local serverPath = pluginPath .. "/../../server.js"
	local pid = vim.fn.jobstart({ "node", serverPath }, {
		detach = true,
		stdout_buffered = true,
		stderr_buffered = true,
		on_stdout = function(_, data)
			dbg("[Server stdout]:", table.concat(data, "\n"))
		end,
		on_stderr = function(_, data)
			dbg("[Server stderr]:", table.concat(data, "\n"))
		end,
	})
	serverPid = pid
	dbg("[LivePreview] Server gestartet mit PID:", pid)
end

local function stopServer()
	-- send exit signal to Node.js first
	vim.fn.jobstart({"curl", "-s", "-X", "POST", previewUrl .. "/exit"}, {detach = true})
	if serverPid then
		pcall(vim.fn.jobstop, serverPid)
		dbg("[LivePreview] Server gestoppt.")
		serverPid = nil
	end
end

function printTable(tbl, indent)
	indent = indent or 0
	local prefix = string.rep("  ", indent)
	for k, v in pairs(tbl) do
		if type(v) == "table" then
			print(prefix .. tostring(k) .. " = {")
			printTable(v, indent + 1)
			print(prefix .. "}")
		else
			print(prefix .. tostring(k) .. " = " .. tostring(v))
		end
	end
end

local function readFile(path)
	path = vim.fn.expand(path)
	local f = io.open(path, "rb")
	if not f then 
		print("[LivePreview] file not found:", path)
		return nil
	end
	local content = f:read("*a")
	f:close()
	return content
end

local function isWithinServerPath(path)
	local plugin_path = debug.getinfo(1, "S").source:sub(2):gsub("/init%.lua", "")
	local static_root = vim.fn.resolve(plugin_path .. "/../../static") .. "/"
	local resolved = vim.fn.resolve(vim.fn.expand(path))
	return resolved:find(static_root, 1, true) == 1
end

local function resolvePath(path)
	local expanded = vim.fn.expand(path)
	if expanded:match("^/") then
		return expanded
	end
	local plugin_path = debug.getinfo(1, "S").source:sub(2):gsub("/init%.lua", "")
	local staticFile = plugin_path .. "/../../static/" .. expanded
	if vim.fn.filereadable(staticFile) == 1 then
		return staticFile
	end
	-- if file not in plugin-static folder, use path relative to current working directory
	return vim.fn.fnamemodify(expanded, ":p")
end

local function enrichConfig(cfg)
	cfg = vim.deepcopy(cfg or {})
	cfg._inlined_styles = {}
	cfg._inlined_scripts = {}
	cfg._inlined_iconsets = {}
	-- Inline only styles outside server path
	if cfg.stylesheets then
		for _, item in ipairs(cfg.stylesheets) do
			local resolved_path = resolvePath(item.path)
			if not isWithinServerPath(resolved_path) then
				local content = readFile(resolved_path)
				if content then
					table.insert(cfg._inlined_styles, { name = item.name, content = content })
				else
					print("[LuaMarkdownPreview] ⚠️ Stylesheet not found: " .. resolved_path)
				end
			end
		end
	end
	-- Inline only libraries outside server path
	if cfg.libraries then
		for _, item in ipairs(cfg.libraries) do
			local resolved_path = resolvePath(item.path)
			if not isWithinServerPath(resolved_path) then
				local content = readFile(resolved_path)
				if content then
					table.insert(cfg._inlined_scripts, { name = item.name, content = content })
				else
					print("[LuaMarkdownPreview] ⚠️ Library not found: " .. resolved_path)
				end
			end
		end
	end
	-- For iconsets: keep external ones inline, local ones remain as paths
	for _, section in ipairs({ "mermaid", "svg" }) do
		if cfg[section] and cfg[section].iconsets then
			local filtered = {}
			for _, pack in ipairs(cfg[section].iconsets) do
				local resolved = resolvePath(pack.path)
				if isWithinServerPath(resolved) then
					-- local file: relative path (browser fetch)
					local rel = resolved:match(".-/static/(.*)$")
					pack.path = "/" .. rel
					table.insert(filtered, pack)
				else
					-- external file: inline instead of path
					local content = readFile(resolved)
					if content then
						table.insert(cfg._inlined_iconsets or {}, {
							section = section,
							name = pack.name,
							content = content,
						})
					else
						print("[LivePreview] ⚠️ External iconset not found: " .. resolved)
					end
					-- ⛔ skip adding pack to filtered (avoid duplicate)
				end
			end
			cfg[section].iconsets = filtered
		end
	end
	return cfg
end

local function buildMessage(bufnr, opts)
	opts = opts or {}
	local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
	local row, _ = unpack(vim.api.nvim_win_get_cursor(0))
	local filetype = vim.api.nvim_buf_get_option(bufnr, "filetype")
	local format = "markdown"
	if filetype == "textile" then 
		format = "textile"
	elseif filetype =="html" then
		format = "html"
	elseif filetype == "svg" then
		format = "svg"
	end
	local context = {}
	for i = math.max(1, row - 5), math.min(#lines, row + 5) do
		local line = lines[i]
		if line and line:match("%S") then
			table.insert(context, vim.trim(line))
		end
	end
	local payload = {
		format = format,
		content = table.concat(lines,"\n"),
		cursor = {row, row}, -- only row is required for scrolling
		context_lines =context,
	}
	if opts.init then
		payload.config = enrichConfig(vim.g.live_preview_options or {})
	end
	local ok, encoded = pcall(vim.fn.json_encode, payload)
	if not ok then
		dbg("[LivePreview] JSON encode failed: " .. tostring (encoded))
		return nil
	end
	return encoded
end

local initSent = false

local function sendInit(bufNr)
	if initSent then return end
	M.send(bufNr, {init =true})
end

function M.send(bufNr, opts)
	opts = opts or {}
	local isInit = opts.init == true
	local msg = buildMessage(bufNr, opts)
	if not msg then
		dbg("[LivePreview] send failed: invalid payload")
		return
	end
	local jobId = vim.fn.jobstart({"curl","-s","-X","POST","--data-binary", "@-", previewUrl .. "/update"}, {
		stdout_buffered = true,
		stderr_buffered = true,
		on_stderr = function (_, data)
			if data and #data > 0 and data[1] ~="" then
				dbg("[LivePreview ERROR]: " .. table.concat(data, "\n"))
			end
		end,
		on_exit = function (_,code,_)
			dbg("[LivePreview EXIT]: curl exited with code " .. tostring(code))
			if code == 0 then
				if isInit then
					initSent = true
					dbg("[LivePreview] Init-Payload transmitted successfully")
				end
			else
				dbg("[LivePreview] Transmission failed (Code: " .. tostring(code) ..")")
				-- retry after 300ms
				if isInit and not initSent and isActive then
					vim.defer_fn (function()
						if not initSent and isActive then
							dbg("[LivePreview] Retry Init Transmission...")
							sendInit(bufNr)
						end
					end, 300)
				end
			end
		end,
	})
	-- transfer payload securely over stdin to curl
	if jobId > 0 then
		vim.fn.chansend(jobId, msg)
		vim.fn.chanclose(jobId, "stdin")
	end
end

function M.start()
	if isActive then
		print("[LivePreview] Bereits aktiv.")
		return
	end
	initSent = false -- resend init data after server start/restart
	startServer()
	autoGroup = vim.api.nvim_create_augroup(groupName, { clear = true })
	vim.api.nvim_create_autocmd({"BufEnter", "InsertEnter", "FileType", "BufWinEnter"}, {
		group = autoGroup,
		pattern = { "*" },
		callback = function(args)
			local ft=vim.bo[args.buf].filetype
			if ft ~= "markdown" and ft ~= "textile" and ft ~="svg" and ft ~="html" then return end 
			if vim.b[args.buf].live_preview_attached then return end
			vim.b[args.buf].live_preview_attached = true
			vim.api.nvim_create_autocmd({ "BufWritePost", "TextChanged", "TextChangedI" }, {
				group = autoGroup,
				buffer = args.buf,
				callback = function(ev)
					M.send(ev.buf)
				end,
			})
			-- Initialsendung direkt nach Setzen des Filetypes
			vim.defer_fn(function()
				sendInit(args.buf)
			end, 100)
		end,
	})
	-- Letzte Sicherheits-Sendung (z. B. falls Filetype schon gesetzt ist)
	vim.defer_fn(function()
		local ft = vim.bo.filetype
		if ft == "markdown" or ft == "textile" or ft == "svg" or ft == "html" then
			sendInit(vim.api.nvim_get_current_buf())
		end
	end, 300)
	openBrowser()
	isActive = true
	print("[LivePreview] Gestartet.")
	-- 🧹 Stoppe Server bei VimLeave (nur einmal registrieren)
	if not M._exit_autocmd_registered then
		vim.api.nvim_create_autocmd("VimLeave", {
			callback = function()
				dbg ("[LivePreview] VimLeave Triggered - stopServer")
				M.stop()
			end,
			desc = "[LivePreview] Stoppe Server bei VimLeave",
		})
		M._exit_autocmd_registered = true
	end
end

function M.stop()
	if not isActive then
		print("[LivePreview] not active")
		return
	end
	initSent=false
	for _, buf in ipairs(vim.api.nvim_list_bufs()) do
		vim.b[buf].live_preview_attached = nil
	end
	vim.api.nvim_del_augroup_by_name(groupName)
	autoGroup = nil
	isActive = false
	stopServer()
	closeBrowser()
	print("[LivePreview] Gestoppt.")
end

function M.setDebug(opts)
	if opts and opts.args == "on" then
		debugEnabled = true
		print("[LivePreview] Debugmodus aktiviert.")
	elseif opts and opts.args == "off" then
		debugEnabled = false
		print("[LivePreview] Debugmodus deaktiviert.")
	else
		print("[LivePreview] Verwendung: :LivePreviewDebug on|off")
	end
end

function M.setup()
	-- Commands nur für markdown/textile setzen
	vim.api.nvim_create_autocmd("FileType", {
		pattern = { "markdown", "textile", "svg", "html" },
		callback = function()
			vim.api.nvim_create_user_command("LivePreview", M.start, {})
			vim.api.nvim_create_user_command("LivePreviewStop", M.stop, {})
			vim.api.nvim_create_user_command("LivePreviewHelper",
				function()
					livePreviewHelper.open_mermaid_pane()
				end, {}
			)
			vim.api.nvim_create_user_command("LivePreviewDebug", M.setDebug, {
				nargs = 1,
				complete = function()
					return { "on", "off" }
				end,
			})
			-- falls Plugin bereits aktiv ist, aktuelle Datei senden
			if isActive then
				M.send(vim.api.nvim_get_current_buf())
			end
		end,
	})
end

return M

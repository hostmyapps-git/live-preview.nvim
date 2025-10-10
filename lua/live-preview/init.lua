M = {}

local groupName = "hostmyapps/LivePreview"
local autoGroup = nil
local isActive = false
local previewUrl = "http://localhost:8765"
local serverPid = nil
local debugEnabled = false

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
			if debugEnabled and data then
				print("[Server stdout]:", table.concat(data, "\n"))
			end
		end,
		on_stderr = function(_, data)
			if debugEnabled and data then
				print("[Server stderr]:", table.concat(data, "\n"))
			end
		end,
	})
	serverPid = pid
	if debugEnabled then
		print("[LivePreview] Server gestartet mit PID:", pid)
	end
end

local function stopServer()
	if serverPid then
		pcall(vim.fn.jobstop, serverPid)
		if debugEnabled then
			print("[LivePreview] Server gestoppt.")
		end
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
	local f = io.open(path, "r")
	if not f then 
		print("[LivePreview] Datei nicht gefunden:", path)
		return nil
	end
	local content = f:read("*a")
	f:close()
	return content
end

local function isWithinServerPath(path)
	local plugin_path = debug.getinfo(1, "S").source:sub(2):gsub("/init%.lua", "")
	local static_root = vim.fn.resolve(plugin_path .. "/../../static/")
	local resolved = vim.fn.resolve(vim.fn.expand(path))
	return resolved:find(static_root, 1, true) == 1
end

local function resolvePath(path)
	local expanded = vim.fn.expand(path)
	if expanded:match("^/") then
		return expanded
	end
	local plugin_path = debug.getinfo(1, "S").source:sub(2):gsub("/init%.lua", "")
	return plugin_path .. "/../../static/" .. expanded
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
						cfg._inlined_iconsets = cfg._inlined_iconsets
					else
						print("[LuaMarkdownPreview] ⚠️ External iconset not found: " .. resolved)
					end
					-- ⛔ skip adding pack to filtered (avoid duplicate)
				end
			end
			cfg[section].iconsets = filtered
		end
	end
	return cfg
end

local function buildMessage(bufnr)
	local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
	local row, _ = unpack(vim.api.nvim_win_get_cursor(0))
	local filetype = vim.api.nvim_buf_get_option(bufnr, "filetype")
	local format = (filetype == "textile") and "textile" or "markdown"
	if filetype == "textile" then 
		format = "textile"
	elseif filetype == "svg" then
		format = "svg"
	else 
		format = "markdown"
	end
	local config = enrichConfig(vim.g.live_preview_options or {})

	-- Kontext: ±5 Zeilen um die Cursorposition
	local context = {}
	for i = math.max(1, row - 5), math.min(#lines, row + 5) do
		local line = lines[i]
		if line and line:match("%S") then
			table.insert(context, vim.trim(line))
		end
	end
	return vim.fn.json_encode({
		format = format,
		content = table.concat(lines, "\n"),
		config = config,
		cursor = { row, row },
		context_lines = context,
	})
end

function M.send(bufnr)
	local msg = buildMessage(bufnr)
	if debugEnabled then
		print("[LivePreview] Sending payload:\n" .. msg)
	end
	vim.fn.jobstart({ "curl", "-s", "-X", "POST", "--data", msg, previewUrl .. "/update" }, {
		stdout_buffered = true,
		stderr_buffered = true,
		on_stderr = function(_, data)
			if debugEnabled and data and #data > 0 then
				print("[LivePreview ERROR]:", table.concat(data, "\n"))
			end
		end,
	})
end

function M.start()
	if isActive then
		print("[LivePreview] Bereits aktiv.")
		return
	end
	startServer()
	autoGroup = vim.api.nvim_create_augroup(groupName, { clear = true })
	vim.api.nvim_create_autocmd({"BufEnter", "InsertEnter", "FileType", "BufWinEnter"}, {
		group = autoGroup,
		pattern = { "*" },
		callback = function(args)
			local ft=vim.bo[args.buf].filetype
			if ft ~= "markdown" and ft ~= "textile" and ft ~="svg" then return end 
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
				M.send(args.buf)
			end, 100)
		end,
	})
	-- Letzte Sicherheits-Sendung (z. B. falls Filetype schon gesetzt ist)
	vim.defer_fn(function()
		local ft = vim.bo.filetype
		if ft == "markdown" or ft == "textile" or ft == "svg" then
			M.send(vim.api.nvim_get_current_buf())
		end
	end, 300)
	openBrowser()
	isActive = true
	print("[LivePreview] Gestartet.")
	-- 🧹 Stoppe Server bei VimLeave (nur einmal registrieren)
	if not M._exit_autocmd_registered then
		vim.api.nvim_create_autocmd("VimLeave", {
			callback = function()
				if debugEnabled then print ("[LivePreview] VimLeave Triggered - stopServer") end
				M.stop()
			end,
			desc = "[LivePreview] Stoppe Server bei VimLeave",
		})
		M._exit_autocmd_registered = true
	end
end

function M.stop()
	if not isActive then
		print("[LivePreview] Nicht aktiv.")
		return
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
		pattern = { "markdown", "textile", "svg" },
		callback = function()
			vim.api.nvim_create_user_command("LivePreview", M.start, {})
			vim.api.nvim_create_user_command("LivePreviewStop", M.stop, {})
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

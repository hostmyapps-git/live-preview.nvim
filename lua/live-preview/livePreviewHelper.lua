local M = {}
local ns_id = vim.api.nvim_create_namespace("LivePreviewHelper")	
local currentLineMap = {}
vim.api.nvim_set_hl(0, "MermaidGreen", { fg = "lightgreen", bold = true })
--code snippets
local presets = {
	{ category = "flowchart" },
	{subcategory = "diagam container"},
	{ label = "flowchart TD", code = "flowchart TD\n\t" },
	{ label = "flowchart LR", code = "flowchart LR\n\t" },
	{label = 'flowchart RL', code = 'flowchart RL'},
	{ label = "subgraph TB", code = "subgraph id[Headline]\n\tdirection TB\n\t\nend" },
	{ label = "subgraph LR", code = "subgraph id[Headline]\n\tdirection LR\n\t\nend" },
	{ label = "subgraph RL", code = "subgraph id[Headline]\n\tdirection RL\n\t\nend" },
	{subcategory = "Nodes"},
	{ label = "bang", code = "id@{shape: bang, label: text}" },
	{ label = "card", code = "id@{shape: card, label: text}" },
	{ label = "cloud", code = "id@{shape: cloud, label: text}" },
	{ label = "collate/hourglass", code = "id@{shape: hourglass, label: text}" },
	{ label = "com-link/lightning/bolt", code = "id@{shape: com-link, label: text}" },
	{ label = "comment", code = "id@{shape: comment, label: text}" },
	{ label = "comment right", code = "id@{shape: brace-r, label: text}" },
	{ label = "curly braces", code = "id@{shape: braces, label: text}" },
	{ label = "input-output-left", code = "id@{shape: lean-left, label: text}" },
	{ label = "input-output-right", code = "id@{shape: lean-right, label: text}" },
	{ label = "database", code = "id@{shape: db, label: text}" },
	{ label = "decision", code = "id@{shape: decision, label: text}" },
	{ label = "delay", code = "id@{shape: delay, label: text}" },
	{ label = "direct access storage", code = "id@{shape: das, label: text}" },
	{ label = "disk storage", code = "id@{shape: disk, label: text}" },
	{ label = "display", code = "id@{shape: display, label: text}" },
	{ label = "divided process", code = "id@{shape: div-proc, label: text}" },
	{ label = "document", code = "id@{shape: doc, label: text}" },
	{ label = "event", code = "id@{shape: event, label: text}" },
	{ label = "extract (triangle)", code = "id@{shape: extract, label: text}" },
	{ label = "fork", code = "id@{shape: fork, label: text}" },
	{ label = "internal storage", code = "id@{shape: internal-storage, label: text}" },
	{ label = "join", code = "id@{shape: join, label: text}" },
	{ label = "junction", code = "id@{shape: junction, label: text}" },
	{ label = "lined document", code = "id@{shape: lined-document, label: text}" },
	{ label = "lined process", code = "id@{shape: lined-process, label: text}" },
	{ label = "shaded process", code = "id@{shape: shaded-process, label: text}" },
	{ label = "loop limit", code = "id@{shape: loop-limit, label: text}" },
	{ label = "manual file", code = "id@{shape: manual-file, label: text}" },
	{ label = "manual input", code = "id@{shape: manual-input, label: text}" },
	{ label = "manual operation", code = "id@{shape: manual, label: text}" },
	{ label = "multi documents", code = "id@{shape: docs, label: text}" },
	{ label = "multi process", code = "id@{shape: processes, label: text}" },
	{ label = "odd", code = "id@{shape: odd, label: text}" },
	{ label = "paper tape", code = "id@{shape: paper-tape, label: text}" },
	{ label = "prepare conditional (hexagon)", code = "id@{shape: prepare, label: text}" },
	{ label = "priority action", code = "id@{shape: priority, label: text}" },
	{ label = "process", code = "id@{shape: process, label: text}" },
	{ label = "start", code = "id@{shape: start, label: text}" },
	{ label = "stop", code = "id@{shape: stop, label: text}" },
	{ label = "stop (with text)", code = "id@{shape: dbl-circ, label: text}" },
	{ label = "stored data", code = "id@{shape: stored-data, label: text}" },
	{ label = "subprocess", code = "id@{shape: subprocess, label: text}" },
	{ label = "summary", code = "id@{shape: summary, label: text}" },
	{ label = "tagged document", code = "id@{shape: tag-doc, label: text}" },
	{ label = "tagged process", code = "id@{shape: tag-proc, label: text}" },
	{ label = "terminal point", code = "id@{shape: terminal, label: text}" },
	{ label = "text", code = "id@{shape: text, label: text}" },
	{ subcategory = "connectors" },
	{ label = "line", code = " --- " },
	{ label = "dotted line", code = " -.- " },
	{ label = "line with label", code = " ---|text| " },
	{ label = "arrow", code = " --> " },
	{ label = "arrow head/tail", code = " <--> " },
	{ label = "circle head", code = " --o " },
	{ label = "circle head/tail", code = " o--o " },
	{ category = "sequence" },
	{subcategory = 'diagram container'},
	{label = 'sequence diagram', code = 'sequenceDiagram autonumber', },
	{label = 'box', code = 'box lavender BoxName\nend'},
	{label = 'loop', code = 'loop Every minute\nend'},
	{label = 'alternatives', code = 'alt condition\nelse other condition\nend'},
	{label = 'optional', code = 'opt description\n\tend'},
	{label = 'parallels', code = 'par action 1\n\nand action2\n\nand action 3\n\nend'},
	{label = 'critical action with condition handling', code = 'critical action 1\n\noption circumstance a\n\noption circumstance b \n\nend'},
	{label = 'break', code = 'break when event takes place\nend'},
	{label = 'background highlight', code = 'rect orange\nend'},
	{label = 'non visible comments', code = '%%'},
	{label = 'links for entities', code = 'links a={"link 1"="url 1", "link 2"="url 2"}'},
	{label = 'line break in text', code = '<br/>'},
	{subcategory = 'elements'},
	{ label = 'participant', code = 'participant P', },
	{ label = 'actor', code = 'actor A', },
	{ label = 'boundary', code = 'participant P@{ type= boundary}', },
	{ label = 'control', code = 'participant C@{ type= control}', }, 
	{ label = 'entity', code = 'participant E@{ type= entity}', }, 
	{ label = 'database', code = 'participant D@{ type= database}', }, 
	{ label = 'collections', code = 'participant P@{ type= collections}', },
	{ label = 'queue', code = 'participant Q@{ type= queue}', },
	{ label = 'aliases', code = 'participant P as ParticipantName', },
	{ label = 'activation', code = 'activate A\n\ndeactivate A', },
	{ label = 'note', code = 'Note over A= Text', },
	{subcategory = 'special'},
	{label = 'create actor',code = "create actor a"},
	{label = 'destroy actor',code = "destroy a"},
	{subcategory = 'connectors'},
	{ label = 'line with arrow', code = 'A -> B= Text'},
	{ label = 'line with arrowhead', code = 'A ->> B= Text'},
	{ label = 'dotted line with arrowhead', code = 'A -->> B= Text'},
	{ label = 'bidirectional line with arrowhead', code = 'A <<->> B= Text'},
	{ label = 'dotted bidirectional line with arrowhead', code = 'A <<-->> B= Text'},
	{ label = 'line with cross', code = 'A -x B= Text'},
	{ label = 'dotted line with cross', code = 'A --x B= Text'},
	{ label = 'line with open arrow', code = 'A -) B= Text'},
	{ label = 'dotted line with open arrow', code = 'A --) B= Text'},
	{ label = "participant", code = "participant P" },
	{ label = "actor", code = "actor A" },
	{ label = "note", code = "Note right of A: Text" },
	{ category = "mindmap" },
	{ subcategory = "diagram containers", },
	{ label = "mindmap", code = "mindmap", },
	{ subcategory = 'elements', },
	{ label = 'rect', code ='nodeId[Text]', },
	{ label = 'rounded rect', code ='nodeId(Text)', },
	{ label = 'bang', code = 'nodeId))Text((', }, 
	{ label = 'cloud', code = 'nodeId)Text(', },
	{ label = 'hexagon', code = 'nodeId{{Text}}', },
	{ label = 'circle', code = 'nodeId((Text))', },
	{ label = 'default', code = 'Text', },
	{ category = "gantt"},
	{ subcategory = 'diagram containers', },
	{label = 'gantt diagram',code = 'gantt\ndateFormat YYYY-MM-DD', },
	{label = 'gantt diagram in days',code = 'gantt\ndateFormat x\naxisFormat %Q\ntask name = taskId, 10, 20', },
	{ subcategory = 'config'},
	{label = 'todayMarker off',code = 'todayMarker off', },
	{label = 'title',code = 'title diagram title', },
	{ subcategory = 'elements', },
	{label = 'section',code = 'section name of section', },
	{label = 'task',code = 'task name = taskId,2026-01-01,2026-03-03', },
	{label = 'task until',code = 'task name = taskId,2026-01-01,until otherTaskId', },
	{label = 'task after',code = 'task name = taskId,after otherTaskId,2026-03-03', },
	{label = 'critical task',code = 'task name = crit,taskId,2026-01-01,2026-03-03', },
	{label = 'active task',code = 'task name = active,taskId,2026-01-01,2026-03-03', },
	{label = 'done task',code = 'task name = done,taskId,2026-01-01,2026-03-03', },
	{label = 'milestone',code = 'task name = milestone,taskId,2026-01-01,2026-03-03', },
	{ category = "kanban", },
	{ subcategory = "diagram containers", },
	{ label = 'kanban diagram', code = 'kanban',},
	{ label = 'kanban section', code = 'sectionId@{label = Section Name}',},
	{ subcategory = 'tasks',},
	{label = 'empty task', code ='\ttaskId@{}',},
	{label = 'very high priority task',code = '\ttaskId@{ label = task name, assigned = person, priority = Very High, ticket = ticketNumber}',},
	{label = 'high priority task',code = '\ttaskId@{ label = task name, assigned = person, priority = High, ticket = ticketNumber}',},
	{label = 'low priority task',code = '\ttaskId@{ label = task name, assigned = person, priority = Low, ticket = ticketNumber}',},
	{label = 'very low priority task',code = '\ttaskId@{ label = task name, assigned = person, priority = Very Low, ticket = ticketNumber}',},
	{ category = 'architecture',},
	{ subcategory = "diagram containers", },
	{ label = 'architecture', code ='architecture-beta',},
	{ label = 'group', code ='group groupId',},
	{ label = 'group with label', code ='group groupId[group name]',},
	{ label = 'group with cloud icon and label', code ='group groupId(cloud)[group name]',},
	{ label = 'group with database icon and label', code ='group groupId(database)[group name]',},
	{ label = 'group with disk icon and label', code ='group groupId(disk)[group name]',},
	{ label = 'group with internet icon and label', code ='group groupId(internet)[group name]',},
	{ label = 'group with server icon and label', code ='group groupId(server)[group name]',},
	{ subcategory = "services", },
	{ label = 'service', code ='service serviceId',},
	{ label = 'service with label', code ='service serviceId[service label]',},
	{ label = 'service with cloud icon', code ='service serviceId(cloud)',},
	{ label = 'service with database icon and label', code ='service serviceId(database)[service label]',},
	{ label = 'service with disk icon and label', code ='service serviceId(disk)[service label]',},
	{ label = 'service with internet icon and label', code ='service serviceId(internet)[service label]',},
	{ label = 'service with server icon and label', code ='service serviceId(server)[service label]',},
	{ label = 'service in group', code ='service serviceId in groupId',},
	{ label = 'junction', code ='junction junctionId',},
	{ label = 'junction in group', code ='junction junctionId in groupId',},
	{subcategory = "connectors" },
	{ label = "LR", code = 'id1:L -- R:id2'},
	{ label = "RL", code = 'id1:R -- L:id2'},
	{ label = "BT", code = 'id1:B -- T:id2'},
	{ label = "TB", code = 'id1:T -- B:id2'},
}

M.active_category = nil

local function insert_snippet(code, target_win)
	-- check if window is still in place
	if not vim.api.nvim_win_is_valid(target_win) then
		print("[Mermaid] Target Pane no longer available.")
		return
	end
	-- switch to main window
	vim.api.nvim_set_current_win(target_win)
	-- insert snippet
	local lines = vim.split(code, "\n")
	vim.api.nvim_put(lines, "c", true, true)
end

local function get_render_data()
	local displayLines = {}
	local lineMap = {} -- stores applicable presets
	for _, item in ipairs(presets) do
	if item.category then
		table.insert(displayLines, "▶ "..item.category)
		table.insert(lineMap, item)
		if M.active_category == item.category then
			displayLines[#displayLines] = "▼ " .. item.category
			local foundCat = false
			for _,subItem in ipairs(presets) do
				if subItem.category ==item.category then foundCat=true
				elseif foundCat and subItem.category then break
				elseif foundCat then
					local text = subItem.label or subItem.subcategory or ""
					if subItem.label then text = "  " .. text end
						table.insert(displayLines, text)
						table.insert(lineMap, subItem)
					end
				end
			end
		end
	end
	return displayLines, lineMap
end

local function renderBuffer(buf)
	vim.api.nvim_buf_set_option(buf, 'modifiable', true)
	vim.api.nvim_buf_clear_namespace(buf, ns_id, 0, -1)
	local lines, lineMap = get_render_data()
	vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
	--highlight
	for i, item in ipairs(lineMap) do
		if item.category then
			-- other groups are "Keyword", "Special" or "Directory" 
			vim.api.nvim_buf_add_highlight(buf, ns_id, "Title", i - 1, 0, -1)
		elseif item.subcategory then
			vim.api.nvim_buf_add_highlight(buf, ns_id, "MermaidGreen", i - 1, 0, -1)
		end
	end
	vim.api.nvim_buf_set_option(buf, 'modifiable', false)
	return lineMap
end



function M.open_mermaid_pane()
	local main_win = vim.api.nvim_get_current_win()
	local buf_name = "LivePreviewHelper"
	-- check if buffer is already in place
	local buf = vim.fn.bufnr(buf_name)
	if buf == -1 then
		-- if buffer not in place create it
		buf = vim.api.nvim_create_buf(false, true)
		vim.api.nvim_buf_set_name(buf, buf_name)
		-- important options on onclose behaviour
		vim.api.nvim_buf_set_option(buf, 'buftype', 'nofile')
		vim.api.nvim_buf_set_option(buf, 'bufhidden', 'wipe') -- kills buffer if window is closed
		vim.api.nvim_buf_set_option(buf, 'swapfile', false)
		vim.api.nvim_buf_set_option(buf, 'filetype', 'mermaid_snippets')
		-- set key mappings (only once)
		vim.keymap.set('n', '<CR>', function()
			local win = vim.api.nvim_get_current_win()
			local line = vim.api.nvim_win_get_cursor(win)[1]
			local selectedItem = currentLineMap[line]
			if not selectedItem then return end
			if selectedItem.category then
				if M.active_category == selectedItem.category then
					M.active_category = nil -- close
				else
					M.active_category = selectedItem.category -- open new
				end
				currentLineMap = renderBuffer(buf)
			elseif selectedItem.code then
				--insert snippet
				insert_snippet(selectedItem.code, main_win)
			end
		end, { buffer = buf, silent = true })
		vim.keymap.set('n', 'q', ':close<CR>', { buffer = buf, silent = true })
	end
	currentLineMap = renderBuffer(buf)
	local win_id = vim.fn.bufwinid(buf)
	if win_id == -1 then
		-- open pane to the left and assign buffer
		vim.cmd('topleft vsplit')
		local new_win = vim.api.nvim_get_current_win()
		vim.api.nvim_win_set_buf(new_win, buf)
		vim.api.nvim_win_set_width(new_win, 50)
	else
		-- if pane open jump to pane
		vim.api.nvim_set_current_win(win_id)
	end
end

return M

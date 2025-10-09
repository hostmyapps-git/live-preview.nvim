-- plugin/live-preview.lua
if vim.fn.has("nvim-0.9") == 1 then
	require("live-preview").setup()
end

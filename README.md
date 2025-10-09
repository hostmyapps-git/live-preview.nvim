# Live-Preview
Live Preview is a neovim plugin, designed to generate realtime preview of markdown and textile documents while editing in neovim. The idea was inspired by the retiread iamcco/markdownpreview.nvim plugin.

## Commands
* `:LivePreview`
* `:LivePreviewStop`
* `:LivePreviewDebug on|off`
## Language Support

Currently the preview of the following filetypes is supported
* markdown 
* textile
* svg

If not detected automatically set it with `:setfiletype markdown`, `:setfiletype textile`, `:setfiletype svg`

## General aspect

* currently only one document at a time
* Browser tab needs to be closed manually


## Diagram Support

* Mermaid Diagrams are supportet by using ` ```mermaid`
* Graphviz and dot is supported by using ` ```dot`
* Plantuml is supported by using ` ```plantuml`
* Math is supported by katex by using ` ```katex`
* Chemistry is supported by katex mhchm by using ` ```mhchem`
* svg is supported by using ` ```svgimg`

SVG based diagrams can be saved directly from the browser (including all styles, references from `<use>` elements, etc.). This is useful for `svgimg`, `mermaid`, `graphviz` and `plantuml`.

# makepaper

Derived from the stylesheets from `paper-templates`, `makepaper` is an attempt
to take the basic concept of the former&mdash;automate the typesetting of academic
writing from Markdown sources using Pandoc&mdash;and make it more robust. Unlike
`paper-templates`, `makepaper` is designed to leverage the power of Pandoc's
templating language instead of relying on Node.js to parse raw HTML templates.
Additionally, `makepaper` attempts to enhance the built-in functionality of
Pandoc by exposing the lower-level capabilities of the typesetting engine in
ways that Pandoc traditionally does not. For example, `makepaper`'s HTML/CSS APA
template (the default) allows for floating tables with captions and table notes.

## Dependencies:

- Linux&mdash;or, more properly, a Bash-compatible shell. Shell scripting is
  lightweight and requires no additional installation in any of my development
  environments&mdash;including Windows, thanks to WSL. Importantly, it is the task
  automation system with which I am most experienced.

- [Node.js](https://nodejs.org/en/) & [npm](https://www.npmjs.com/)&mdash;While
  there are libraries available for parsing and manipulating HTML in Bash,
  the ability to use Cheerio's modified jQuery API for these tasks reduces
  cognitive load, as I already know these conventions.

- [Pandoc](https://github.com/jgm/pandoc)&mdash;Handles translation of Markdown to
  HTML. Pandoc is a Haskell library and command line application for converting
  between various document formats. In addition to citation management, it
  handles syntax highlighting for me.

- [`pandoc-citeproc`](https://github.com/jgm/pandoc-citeproc)&mdash;handles
  citations, as an extension of Pandoc.

- [Prince](https://www.princexml.com/)&mdash;I’m using Prince for HTML/CSS-to-PDF
  conversion because it’s free for noncommercial use, does a nice job on the
  rendering, and handles ligatures nicely.

## Document specs:

The default stylesheet targets the styles outlined in the American Psychological
Association's 6th Edition style guide.

- 1 inch page margins
- APA-style running heads, including the paper title and page number
- Title page including paper title, author name, and university affiliation
- Paper title centered on first page of content
- Double-spaced paragraphs, indented ½ inch, with no extra space between
- APA-style in-text citations and reference list, processed from CSL-JSON
- Five APA-specified headings

## Specifications NOT implemented:

I don’t have to do these things, so I haven’t implemented them. If I have to do
them at some point, they’ll get an implementation.

- Abstract and abstract page
- Author’s notes on title page
- Appendices
- Tables and Figures

## Non-APA Features:

Non-spec features are implemented because I like the results and I haven’t
gotten in trouble for them yet, or are implementations of school-specific
peculiarities.

- Simple four-line heading blocks instead of full title pages

## Planned Features:

Most of the work I do on this is related to things I need for specific classes
or assignments. As such, there's not really a plan for most future development.
However, there are a few features that I've definitely got on the roadmap:

- LaTeX typesetting backend: Prince does a reasonable job, and allows for
  powerful CSS-driven styling and layout. However, it struggles with complex
  mathematics and multiple/long footnotes. Thus, I'd like to allow the user to
  select either the LaTeX or HTML/Prince backend, either at the command line or,
  preferably, in the YAML metadata block.
- User-specified templates: I'd like to allow the user to specify a template,
  likely with both a command-line passthrough and a YAML metadata option.
- If I ever have to write something that isn't based off APA style (which is
  apparently favored by my institution, despite it not really being in vogue for
  Computer Science research), there's a chance I'd refactor some of the more
  generalizable functionality (like inclusions) so I can reuse it in other build
  scripts.

## Quirks:

### Metadata:

Authors should include document metadata in a Pandoc-style YAML metadata block
at the beginning of their document. Currently supported fields include:

#### `title`, `subtitle`, and `short-title`

The `title` field is required for the currently-implemented HTML-based APA
template. The template additionally supports the optional `subtitle` and
`short-title` fields; the `subtitle` is set on a separate line in title blocks,
while the `short-title` field is used for the short-block header and running
head. All three are strings.

#### `author`

The author's name, a string, is set on the title page or in the short-block
header.

#### `course` and `university`

Both the `course` field and the `university` field are string values. The former
is used in the short-block header, while the latter is set on the title page.

#### `title-page` or `header-block`

One or both of these boolean fields can be set `true` to indicate that the
relevant type of paper title should be used. The `title-page` attribute produces
an APA-style title page, with the paper title, author's name, and the university
affiliation centered on the top half of the page. The latter produces a
MLA-inspired header block, starting with the author's name and the paper short
title, and optionally including the course and date.

#### `abstract` and `keywords`

These fields are used to produce the abstact page of an APA-style paper. The
former is a multi-line string:

```
abstract: |
This is an abstract. It can
contain multiple lines.
```

while the latter is a bulleted list:

```
keywords:
- nitwit
- blubber
- oddment
- tweak
```

#### `bibliography` and `csl`

These fields are used by Pandoc to generate citations and the bibliography.
Pandoc can take a bibliography file in Bib(La)TeX, CSL-JSON, and CSL-YAML.
Citation styles are provided in Citation Style Language `.csl`.

#### `css`

The APA-HTML template (and, likely, future HTML-based build chains) will accept
arbitrary CSS files for additional styling. This exposes the incredible power of
Prince's CSS layout engine; one could theoretically overwrite the entire
stylesheet of the document to produce a radically different
document&mdash;although, at this point, one would be better off writing a new
document template and stylesheet.

### Reference Processing

References are processed using Pandoc’s implementation of `citeproc`. I like
BibLaTeX; however, any database format supported by Pandoc should work. Full
documentation is available in the
[Pandoc docs](http://pandoc.org/MANUAL.html#citations).

## Licensing and Such

I haven’t picked a license for this project principally because I expect it to
be of limited utility to others. If you want to use it, go for it. If you’d like
to implement some of the features I haven’t, I’m on board. If you think I suck
and want horrible things to happen to me, please keep those opinions to
yourself.

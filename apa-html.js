#!/usr/bin/node

const argv = require('minimist')(process.argv.slice(2))
const { execSync } = require('child_process')
const fs = require('fs-extra')
const cheerio = require('cheerio')
const matter = require('gray-matter')

/**
 * getExtension: Gets a file type extension from a filename, if there is one
 *
 * @param {string} path The path to the file
 * @returns {string} the file type extension
 */
function getExtension(path) {
    let basename = path.split(/[\\/]/).pop(),
        pos = basename.lastIndexOf(".")

    if (basename === "" || pos < 1)
        return "";

    return basename.slice(pos + 1)
}

/**
 * include: Process a file for inclusion in the main document
 *
 * @param {string} filepath The path to the file to be included
 * @return {string} the processed inclusion
 */
function include(filepath) {
    try {
        if (getExtension(filepath) == "html") {
            return fs.readFileSync(filepath).toString()
        } else if (getExtension(filepath) == "md") {
            return processMarkdownInclusion(filepath)
        } else {
            console.log(`Warning: inclusion ${obj.html()} is of unknown type`)
        }
    }
    catch (e) {
        console.log(`Warning: file ${e.path} not found`)
    }
}

/**
 * loadMain: load a Pandoc Markdown document into cheerio for further processing
 *
 * @param {string} sourceFile The path to the source file
 * @param {string} installRoot The path to the makepaper install directory
 * @return The processed cheerio DOM object of the main document
 */
function loadMain(sourceFile, installRoot) {
    const pandocCommand = 'pandoc ' +
          '-t html --standalone ' +
          `--template=${installRoot}/templates/apa.html ` +
          sourceFile
    return cheerio.load(execSync(pandocCommand).toString())
}

/**
 * loadMeta: load a Pandoc Markdown document and strip the YAML frontmatter
 *
 * @param {string} sourceFile The path to the file to load
 * @returns A gray-matter file object with the document content and metadata
 */
function loadMeta(sourceFile) {
    console.log('Loading metadata...')
    try {
        return matter.read(sourceFile)
    }
    catch (e) {
        return matter.read(sourceFile, {delimiters: ['---', '...']})
    }
}

/**
 * processCitations: executes a final pass of Pandoc over the draft HTML file
 *                   to process Pandoc-style citations
 *
 * @param {string} draftFile The path to the draft HTML file
 * @param {string} installRoot The path to the makepaper install directory
 * @param metaFile The gray-matter file object containing the file metadata
 */
function processCitations(draftFile, installRoot, metaFile) {
    // TODO: Arbitrary bib files pulled from YAML header
    let bibFile = 'refs.bib'
    if (metaFile.data.hasOwnProperty('bibliography')) {
        bibFile = metaFile.data.bibliography
    }
    pandocCommand = 'pandoc ' +
        '--from=markdown ' + // target only the markdown citations
        '--to=html ' +
        `--output=${draftFile} ` +
        '--filter=pandoc-citeproc ' +
        `--csl=${installRoot}/styles/csl/apa.csl ` +
        `--bibliography=${bibFile}`
    execSync('echo $(cat ' + draftFile + ') | ' + pandocCommand)
    execSync(`sed -i 1d ${draftFile}`) // kludge away the <!DOCTYPE html> line
}

function processMarkdownInclusion(inclusionPath) {
    pandocCommand = 'pandoc ' +
        '-t  html ' +
        inclusionPath
    return execSync(pandocCommand).toString()
}

console.log('This is the APA-HTML paper build script.')
console.log(`Source file: ${argv._[0]}`)

const installRoot = argv.installRoot
const sourceFile = argv._[0]

const metaFile = loadMeta(sourceFile)

// Run Pandoc and load the generated HTML into Cheerio
console.log('Generating HTML...')
const $ = loadMain(sourceFile, installRoot)

console.log('Sourcing inclusions...')
$('.include').each(function (i, obj) {
    $(this).parent().replaceWith(include($(this).html()))
})

// Push figure classes up to the implicit figure element added by Pandoc

const figureElementClasses = [
  // Add classes to this array to pull them up from the image to the figure
  'float-top',
  'float-bottom',
  'full-page'
]
console.log('Generating figures...')
$('figure').each(function (i, obj) {
  try {
    let classNameArray = $(this).children('img').attr('class').split(/\s+/)
    for (let className of classNameArray) {
      if (figureElementClasses.includes(className)) {
        $(this).addClass(className)
        $(this).children('img').removeClass(className)
      }
    }
  } catch (e) {
    console.log("Figure has no classes.")
  }
})

/* Captioned and Annotated APA-style tables. This grabs any tables not otherwise
 * styled and wraps them in a figure element that can be styled to float or not.
 * Then grab the following 'table-notes' paragraph and stuff it into the figure.
 * NOTE: There is currently no support for selectively floating tables.
 *       It's all or nothing. This may be implemented later, if I care.
 */

console.log('Generating tables...')
$('table').each(function (i, obj) {
    if ($(this).attr('class') == null) {
        $(this).wrap('<figure class="table-float"></figure>')
    }
})

$('.table-notes').each(function (i, obj) {
    $(this).appendTo($(this).prev('figure.table-float'))
    if ($(this).attr('style') !== null) {
        $(this).parent().attr('style', $(this).attr('style'))
        $(this).removeAttr('style')
    }
})

// Inline our h4--h6 tags for APA-style rendering. And prepend table numbers.
console.log('Inlining Subsub[sub[sub]]section headers...')
$('h4, h5, h6').each(function (i, obj) {
    $(this).prependTo($(this).next())
    if ($(this).parent().hasClass('table-float')) {
        $(this).parent().prepend('<p class="table-number"></p>')
    }
})

// Link the globally-installed APA stylesheet in non-standard installs.

console.log('Linking stylesheet...')
styleLink = `${installRoot}/styles/css/apa.css`
$('link[href="styles-apa.css"]').attr('href', styleLink)

// Write out the HTML, typeset it with Prince, and clean up.
console.log('Writing HTML...')
let draftFile = 'draft.html'
fs.writeFileSync(draftFile, $.html())
processCitations(draftFile, installRoot, metaFile)
console.log('Generating PDF...')
execSync('prince draft.html', {stdio: 'inherit'})
// fs.unlinkSync('draft.html')
console.log('Done!')

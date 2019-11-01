#!/usr/bin/node

const argv = require('minimist')(process.argv.slice(2))
const { execSync } = require('child_process')
const fs = require('fs-extra')
const cheerio = require('cheerio')

console.log('This is the APA-HTML paper build script.')
console.log(`Source file: ${argv._[0]}`)

const installRoot = argv.installRoot
const sourceFile = argv._[0]

// Run Pandoc and load the generated HTML into Cheerio
console.log('Generating HTML...')
const pandocCommand = 'pandoc --filter=pandoc-citeproc -t html --standalone ' +
      `--template=${installRoot}/templates/apa.html ${sourceFile}`
const $ = cheerio.load(execSync(pandocCommand).toString())

/* Inclusions: Include arbitrary HTML files in the build document
 * TODO: It might be nice to someday support arbitrary Markdown, also.
 */
console.log('Sourcing inclusions...')
$('.include').each(function (i, obj) {
    try {
        let inclusion = fs.readFileSync($(this).html()).toString()
        $(this).parent().replaceWith(inclusion)
    }
    catch (e) {
        console.log(`Warning: file ${e.path} not found.`)
    }
})

// Push figure classes up to the implicit figure element added by Pandoc

const figureElementClasses = [
    // Add classes to this array to pull them up from the image to the figure
    'float-top',
    'full-page'
]
console.log('Generating figures...')
$('figure').each(function (i, obj) {
    let classNameArray = $(this).children('img').attr('class').split(/\s+/)
    for (let className of classNameArray) {
        if (figureElementClasses.includes(className)) {
            $(this).addClass(className)
            $(this).children('img').removeClass(className)
        }
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
fs.writeFileSync('draft.html', $.html())
console.log('Generating PDF...')
execSync('prince draft.html', {stdio: 'inherit'})
fs.unlinkSync('draft.html')
console.log('Done!')

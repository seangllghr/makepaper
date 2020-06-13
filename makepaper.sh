#!/bin/bash

print_help() {
    echo "
Usage: makepaper [start, buildtype, document] [buildtype, document]
   or: makepaper [init] [filename stem]

Build a paper from a Markdown source file. If no arguments are given, makepaper
will build a standard APA paper using the HTML backend. Arguments can include a
buildtype or document, which can occur in any order, or 'start', which must be
the first option. A valid document must be a .md or .txt file; the extension can
be omitted.

Passing 'init' and a filename will generate a blank document.

Valid buildtypes are: apa-html, math-latex"
}

init_document () {
    document_filetype=$(echo $1 | cut -d'.' -f 2)
    if [ $document_filetype == "md" ] || [ $document_filetype == "txt" ] || [ $document_filetype == "tex" ]; then
        document=$1
    elif test -f "$1.md" || test -f "$1.txt" || test -f "$1.tex"; then
        if test -f "$1.md"; then
            document="$1.md"
        elif test -f "$1.tex"; then
            document="$1.tex"
        else
            document="$1.txt"
        fi
    else
        echo "Document does not appear to be a Markdown source file."
        return 1
    fi
}

init_buildtype () {
    case $1 in
        "default")
            init_buildtype "apa-html"
            ;;
        "apa-html")
            buildtype="apa-html"
            ;;
        "math-latex")
            buildtype="math-latex"
            ;;
        *)
            echo "$1 is not a valid build type."
            return 1
            ;;
    esac
}

load_makepaper_config () {
    if test -f .makepaper; then
        source .makepaper
        echo "Loaded settings from .makepaper."
    else
        echo "Loaded default build settings."
        return 1
    fi
}

load_settings () {
    str=$(readlink -f $(which makepaper))
    makepaperdir=${str%/*}
    if [ $# -eq 0 ]; then
        load_makepaper_config
    elif [ $# -eq 1 ]; then
        if [ $1 == "start" ]; then
            echo "Starting watcher..."
            load_makepaper_config
            watcher=true
        elif [ $1 == "--help" ] || [ $1 == "-h" ]; then
            print_help
            exit
        elif ! init_buildtype $1 > /dev/null; then
            load_makepaper_config
            if ! init_document $1 > /dev/null; then
                echo "Warning: Not a valid buildtype or document. Falling back."
            fi
        fi
    elif [ $# -eq 2 ]; then
        if [ $1 == "start" ]; then
            echo "Starting watcher..."
            load_makepaper_config
            watcher=true
            if ! init_buildtype $2 > /dev/null; then
                if ! init_document $2 > /dev/null; then
                    echo "Warning: Not a valid build type or document. Falling back."
                fi
            fi
        else
            if ! init_buildtype $1 > /dev/null; then
                if ! init_buildtype $2 > /dev/null; then
                    echo "Warning: No valid build type provided. Falling back."
                fi
            fi
            if ! init_document $1 > /dev/null; then
                if ! init_document $2 > /dev/null; then
                    echo "Warning: No valid document provided. Falling back."
                fi
            fi
        fi
    else
        echo "Error: Too many arguments"
        exit 1
    fi
}

build_launcher () {
    case $buildtype in
        "apa-html")
            node $makepaperdir/apa-html.js --installRoot=$makepaperdir $document
            ;;
        "math-latex")
            echo "Building with Pandoc/LaTeX"
            pandoc \
                --template=$makepaperdir/templates/math.tex \
                --from=markdown \
                --to=latex \
                --output=$(echo $document | cut -d'.' -f 1).pdf \
                $document
            echo "Done!"
            ;;
    esac
}

build_watcher () {
    inotifywait -e close_write,moved_to,create -m $document |
        while read -r directory events filename; do
            build_launcher
        done
}

makepaper_init () {
    if [[ $# < 1 ]]; then
        filename=main.md
    else
        filename="$1.md"
    fi
    cat << EOF > $filename
---
author: Sean Gallagher
title: "Assignment Title"
short-title: "Short Title"
running-head: "RUNNING HEAD"
course: "Course"
university: Southern New Hampshire University
header-block: true
title-page: false
bibliography: refs.bib
---
EOF
    [[ ! -e refs.bib ]] && touch refs.bib
}

makepaperdir=""
buildtype="apa-html"
document="main.md"
watcher=false

if [[ $1 == "init" ]]; then
    makepaper_init $2
else
    load_settings $@
    if $watcher; then
        build_launcher
        build_watcher
    else
        build_launcher
    fi
fi

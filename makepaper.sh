#!/bin/bash

init_document () {
    document_filetype=$(echo $1 | cut -d'.' -f 2)
    if [ $document_filetype == "md" ] || [ $document_filetype == "txt" ]; then
        document=$1
    elif test -f "$1.md" || test -f "$1.txt"; then
        if test -f "$1.md"; then
            document="$1.md"
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

makepaperdir=""
buildtype="apa-html"
document="main.md"
watcher=false

load_settings $@
if $watcher; then
    build_watcher
else
    build_launcher
fi

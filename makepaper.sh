#!/bin/bash

build_launcher () {
    case $1 in
        "apa-html")
            node $makepaperdir/apa-html.js --installRoot=$makepaperdir $2
            ;;
        *)
            echo 'Error: specified build type not found.'
            ;;
    esac
}

build_watcher () {
    inotifywait -e close_write,moved_to,create -m $2 |
        while read -r directory events filename; do
            build_launcher $1 $2
        done
}

str=$(readlink -f $(which makepaper))
makepaperdir="${str%/*}"

if [ $# -eq 0 ]
then
    # Default build. Look for .makepaper file or build APA through HTML
    if test -f "$cwd/.makepaper"
    then
        echo ".makepaper found, building with specified options."
        # TODO: Parse .makepaper for build options.
    else
        echo "No .makepaper file found. Building with default options."
        build_launcher 'apa-html' 'main.md'
    fi
elif [ $# -eq 1 ]
then
     if [ $(echo $1 | cut -d'.' -f 2) == 'md' ] && test -f $1
     then
         build_launcher 'apa-html' $1
     elif [ $1 == 'start' ]
     then
         if test -f "$cwd/.makepaper"
         then
             echo "Configuration found. Starting watcher..."
             # TODO: Parse the .makepaper for build options and launch the watcher
         elif [ $# -gt 1 ]
         then
             echo "Error: watcher must be preconfigured using .makepaper or launched with defaults."
         else
             echo "No configuration found; using defaults. Starting watcher..."
             build_watcher 'apa-html' 'main.md'
         fi
     elif [ $1 == 'test' ]
     then
         node "$makepaperdir/test.js"
     else
         echo "Error: expected Markdown source or source file not found."
     fi
elif [ $# -eq 2 ]
then
    if [ $(echo $1 | cut -d'.' -f 2) == 'md' ]
    then
        build_launcher $2 $1
    elif [ $(echo $2 | cut -d'.' -f 2) == 'md' ]
    then
        build_launcher $1 $2
    else
        echo "Error: Build type not found."
    fi
else
    echo "Error: too many arguments."
fi

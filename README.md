## hex-grid-map

A customizeable html5 hexagonally gridded interactive map.

## Installation

hex-grid-map is available on npm.
Simply install and save in your project. [Browserify](http://browserify.org/) is the reccomended way to then use it in your project.
```
npm install --save hex-grid-map
```

## Architecture

The [hexagonal-map](http://chad-autry.github.io/hex-grid-map/#/jsdoc/module-hexagonal-map?anchor=hexagonal-map#hexagonal-map) is the main controller. It is injected with various [Conexts](http://chad-autry.github.io/hex-grid-map/#/jsdoc/Context?anchor=Context#Context) to act as sub-controllers for the layers of the map.

## API Reference

[API](http://chad-autry.github.io/hex-grid-map/#/jsdoc)

## Demo

Check out the [Demo](http://chad-autry.github.io/hex-grid-map/#/demo). And then take a look at the [source of the demo](https://github.com/chad-autry/hex-grid-map/blob/master/gh-pages/src/app/demo/demo.js) to see how everything was instantiated.

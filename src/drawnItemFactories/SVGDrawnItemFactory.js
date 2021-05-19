"use strict";
/**
 * Since only a single constructor is being exported as module.exports this comment isn't documented.
 * The class and module are the same thing, the contructor comment takes precedence.
 * @module SVGDrawnItemFactory
 */
 
var paper = require('paper/dist/paper-core.js');

/**
 * Factory which delegates to the paper.js RegularPoloygon constructor
 * @constructor
 * @param {external:cartesian-hexagonal} hexDefinition - The DTO defining the hex <--> cartesian relation
 * @see {@link http://paperjs.org/reference/path/#path-regularpolygon-object | RegularPolygon }
 */
module.exports = function SVGDrawnItemFactory(hexDefinition) {
    this.hexDefinition = hexDefinition;
};

/**
 * Return an arrow path item for the given object
 * @override
 * @param {Object} item - The DTO to produce a paper.js drawn item for
 * @param {string} item.svg - The svg string to import into the project
 * @param {integer} item.scale - Scale the svg to scale*hexDefinition.hexagon_edge_to_edge_width
 * @param {integer} item.rotation - The angle in degrees to rotate, 0 degrees points ???
 * @param {onClick=} item.onClick - The callback to use when this item is clicked
 * @returns {external:Item} The paper.js Item for the given parameters
 * @implements {DrawnItemFactory#getDrawnItem}
 * @todo consider using symbols for performance
 */
module.exports.prototype.getDrawnItem = function(item) {
    if (!paper.Item.prototype.setRampPoint) {
        paper.Item.prototype.setRampPoint = function () {};
   }
 var drawnItem = paper.project.importSVG(item.svg);
 drawnItem.position = new paper.Point(drawnItem.bounds.width/2, drawnItem.bounds.height/2);
 // color manipulation are delegated to the svg string production
 //TODO cache Symbols for imported SVG
 drawnItem.rotate(item.rotation);

 
 
 drawnItem.scale(item.scale*this.hexDefinition.hexagon_edge_to_edge_width/drawnItem.bounds.width, 
    item.scale*this.hexDefinition.hexagon_edge_to_edge_width/drawnItem.bounds.height );
 
 drawnItem.scale(1, this.hexDefinition.vScale);
 drawnItem.data.item = item;
 
 // Add shadow
 drawnItem.shadowColor = new paper.Color(0, 0, 0);
 // Set the shadow blur radius to 12:
 drawnItem.shadowBlur = 10;
 // Offset the shadow by { x: 5, y: 5 }
 drawnItem.shadowOffset = new paper.Point(0, 5);

 

 return drawnItem;
};

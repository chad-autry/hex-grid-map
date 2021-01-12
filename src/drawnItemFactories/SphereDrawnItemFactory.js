"use strict";
/**
 * Since only a single constructor is being exported as module.exports this comment isn't documented.
 * The class and module are the same thing, the contructor comment takes precedence.
 * @module SphereDrawnItemFactory
 */

var paper = require('paper/dist/paper-core.js');
/**
 * A factory to create the paper.js item for Sphere
 * @constructor
 * @param {external:cartesian-hexagonal} hexDefinition - The DTO defining the hex <--> cartesian relation
 */
module.exports = function SphereDrawnItemFactory(hexDefinition) {
    this.hexDefinition = hexDefinition;

};

/**
 * Returns a projected sphere drawn item for the given object
 * Object should have lineWidth, lineColor, backgroundColor, rotation, size, sliceCount, wedgeCount
 */
/**
 * Returns a vector drawn item for the given object
 * @param {Object} item - The DTO to produce a paper.js drawn item for
 * @param {Color} item.backgroundColor - The base color of the sphere
 * @param {Color} item.lineColor - The color of the latitude and longitude lines
 * @param {number} item.size - The size to draw the sphere at relative to a hex 100 means 100%
 * @param {number} item.rotation - Starting as if viewed from above, the rotation of the top of the sphere up and back into the x-y plane
 * @param {number[]} item.greatCircleAngles - Longitude lines, measured in radians, straight up and down 0, clockwise +, counterclockwise -
 * @param {number[]} item.latitudeAngles - Latitude lines to draw measured in radians, equator 0, up +, down -
 * @param {number} item.lineWidth - The thickness of the latitude & longitude lines
 * @param {external:Star=} item.borderStar - The properties of a paper.js Star to use as the border of the sphere (gives it a serated border)
 * @param {onClick=} item.onClick - The callback to use when clicking the vector
 * @returns {external:Item} The paper.js Item representing the vector
 * @implements {DrawnItemFactory#getDrawnItem}
 */
module.exports.prototype.getDrawnItem = function(item) {
    var radius = item.size * this.hexDefinition.hexagon_edge_to_edge_width/200; //Draw it a bit big, we'll trim it into a circle
    var upperClippingCircle = new paper.Path.Circle({center: [0, 0],
    radius: radius - 0.5});
    var lowerClippingCircle = new paper.Path.Circle({center: [0, 0],
    radius: radius - 0.5});

    var upperGroup = new paper.Group();
    var lowerGroup = new paper.Group();
    var upperClippedGroup = new paper.Group();
    var lowerClippedGroup = new paper.Group();
    var p = null;
    
    upperGroup.pivot = new paper.Point(0, 0);
    lowerGroup.pivot = new paper.Point(0, 0);
    
    upperClippedGroup.addChild(upperClippingCircle);
    lowerClippedGroup.addChild(lowerClippingCircle);
    upperClippedGroup.clipped = true;
    lowerClippedGroup.clipped = true;
    var j; //use j within several loops below
    
    //The top part of the sphere will always be bordered by a half circle
    var upperArcFrom = new paper.Point(-radius, 0);
    var upperArcThrough = new paper.Point(0, -radius);
    var upperArcTo = new paper.Point(radius, 0);
    var upperArc = new paper.Path.Arc(upperArcFrom, upperArcThrough, upperArcTo);
    
    var equatorPoints = [];
    //Make the equator path, only care about the front portion
    for(var alpha = Math.PI; alpha <= 2*Math.PI; alpha += 0.17) {
        p = {};
        p.x = Math.cos(alpha) * radius;
        p.z = 0;
        p.y = -Math.sin(alpha) * radius;
        equatorPoints.push(p);
    }
    equatorPoints.push({x:radius, y:0, z:0});
    //Transform the equator for the rotation, and simultaneously prep use the X, Y co-ords for the equator path
    var equatorSegments = [];
    for (var i = 0; i < equatorPoints.length; i++) {
       this.rotateX(equatorPoints[i], item.rotation);
       equatorSegments.push([equatorPoints[i].x, equatorPoints[i].y]);
    }
    //Draw the path of the equator's X, Y coordinates
    var equatorPath = new paper.Path({
        segments: equatorSegments,
    });
    //Smooth it out
    equatorPath.smooth();
    //Combine with the upper bound to make our upper shape border
    var upperPath = new paper.CompoundPath({
        children: [
            equatorPath,
            upperArc
        ],
        fillColor: item.backgroundColor
    });

    upperGroup.addChild(upperPath);
    //The lower part of the sphere will always be bordered by a half circle, the upper shape will simply lay on top of it
   
    var lowerArcFrom = new paper.Point(-radius, 0);
    var lowerArcThrough = new paper.Point(0, radius);
    var lowerArcTo = new paper.Point(radius, 0);
    var lowerArc = new paper.Path.Arc(lowerArcFrom, lowerArcThrough, lowerArcTo);
    lowerArc.fillColor = item.backgroundColor;
    lowerGroup.addChild(lowerArc);
    upperGroup.addChild(upperClippedGroup);
    lowerGroup.addChild(lowerClippedGroup);
    //if given, draw latitude lines at other angles
    if (!!item.latitudeAngles) {
        var latitudePoints;
        for (i = 0; i < item.latitudeAngles.length; i++) {
            latitudePoints = [];
            var latitudeAngle = item.latitudeAngles[i]; //measured in radians, equator 0, up +, down -
            var circleRadius = Math.cos(latitudeAngle) * radius;//the radius of a circle parallel to the equator at the given angle
            var zHeight = Math.sin(latitudeAngle) * radius;
            
            for(j = 0; j <= 2*Math.PI; j += 0.17) {
                alpha = (j + Math.PI/2)%(2*Math.PI); //Shift to the back
                p = {};
                p.x = Math.cos(alpha) * circleRadius;
                p.z = zHeight;
                p.y = -Math.sin(alpha) * circleRadius;
                latitudePoints.push(p);
            }

            var circleSegments = [];
            for (j = 0; j < latitudePoints.length; j++) {
                this.rotateX(latitudePoints[j], item.rotation);
                if (latitudePoints[j].z >= 0 ) {
                    circleSegments.push([latitudePoints[j].x, latitudePoints[j].y]);
                }
            }
            if (circleSegments.length > 0 ) {
                //Draw the path 
                var circlePath = new paper.Path({
                    segments: circleSegments,
                });
                circlePath.strokeColor = item.lineColor;
                circlePath.strokeWidth = item.lineWidth;
                if (latitudeAngle >= 0) {
                    upperClippedGroup.addChild(circlePath);
                } else {
                    lowerClippedGroup.addChild(circlePath);
                }
            }
        }

    }
    
    //if given, draw great circles, perpendicular to the equator, going through the poles
    if (!!item.greatCircleAngles) {
        var upperGreatCirclePoints;
        var lowerGreatCirclePoints;
        for (i = 0; i < item.greatCircleAngles.length; i++) {
            upperGreatCirclePoints = [];
            lowerGreatCirclePoints = [];
            var greatCircleAngle = item.greatCircleAngles[i]; //measured in radians, straight up and down 0, clockwise +, counterclockwise -

            for(alpha = 0; alpha <= Math.PI; alpha += 0.17) {
                //TODO only make 1 copy of the original half circle, then copy and mutate
                var pTop = {};
                var pBottom = {};
                pTop.x = 0;
                pTop.y = Math.cos(alpha) * radius;
                pTop.z = Math.sin(alpha) * radius;
                //Rotate about the z axis
                this.rotateZ(pTop, greatCircleAngle);
                //The lower points are the same as the upper, with a negative z
                pBottom.x = pTop.x;
                pBottom.y = pTop.y;
                pBottom.z = - pTop.z;
                upperGreatCirclePoints.push(pTop);
                lowerGreatCirclePoints.push(pBottom);
            }

            var upperCircleSegments = [];
            var lowerCircleSegments = [];
            for (j = 0; j < upperGreatCirclePoints.length; j++) {
                this.rotateX(upperGreatCirclePoints[j], item.rotation);
                this.rotateX(lowerGreatCirclePoints[j], item.rotation);
                if (upperGreatCirclePoints[j].z >= 0 ) {
                    upperCircleSegments.push([upperGreatCirclePoints[j].x, upperGreatCirclePoints[j].y]);
                }
                if (lowerGreatCirclePoints[j].z >= 0 ) {
                    lowerCircleSegments.push([lowerGreatCirclePoints[j].x, lowerGreatCirclePoints[j].y]);
                }
            }

            //Draw the paths 
            var lowerGreatcirclePath = new paper.Path({
                segments: lowerCircleSegments,
            });
            lowerGreatcirclePath.strokeColor = item.lineColor;
            lowerGreatcirclePath.strokeWidth = item.lineWidth;
            
            var upperGreatcirclePath = new paper.Path({
                segments: upperCircleSegments,
            });
            upperGreatcirclePath.strokeColor = item.lineColor;
            upperGreatcirclePath.strokeWidth = item.lineWidth;
            
            upperClippedGroup.addChild(upperGreatcirclePath);
            
            lowerClippedGroup.addChild(lowerGreatcirclePath);

        }
    }
    
    //Todo simplify this mess of lines and groups into a single item to be hit-tested/drawn
    //drawn item fatories return only 1 item, but compound items like this (above and below grid) return the lower half as a property of the upper half
    
    upperGroup.data.belowGridItem = lowerGroup;
    var upperBorderItem;
    if (!!item.borderWidth) {
        var backGroundCircle = new paper.Path.Circle({center: [0, 0],
        radius: radius + item.borderWidth,
        fillColor: item.borderColor});
        lowerGroup.addChild(backGroundCircle);
        backGroundCircle.sendToBack();
        upperBorderItem = backGroundCircle.clone(false);
    }
    
    if (!!item.borderStar) {
        var backGroundStar = new paper.Path.Star({center: [0, 0],
        radius1: radius + item.borderStar.radius1,
        radius2: radius + item.borderStar.radius2,
        points: item.borderStar.points,
        fillColor: item.borderStar.borderColor});
        lowerGroup.addChild(backGroundStar);
        backGroundStar.sendToBack();
        
        upperBorderItem = backGroundStar.clone(false);
    }
    
    //Need the upper portion of the border to cover items appropriately, create another copy masked to only the upper half
    if (!!upperBorderItem) {
        var upperBorderClippingGroup = new paper.Group();
        upperBorderClippingGroup.pivot = new paper.Point(0, 0);
        
        upperBorderClippingGroup.addChild(new paper.Shape.Rectangle({
        from: [-radius - 200, -radius - 200],
        to: [radius + 200, 0],
        strokeColor: 'black'}));
        upperBorderClippingGroup.clipped = true;
        upperBorderClippingGroup.addChild(upperBorderItem);
        upperGroup.addChild(upperBorderClippingGroup);
        upperBorderClippingGroup.sendToBack();
    }
    upperGroup.data.item = item;
    return upperGroup;
    
    
};

/**
 * Utility method to rotate point by X in a 3D space
 * @private
 */
module.exports.prototype.rotateX = function(point, radians) {
    var z = point.z;
    point.z = (z * Math.cos(radians)) + (point.y * Math.sin(radians));
    point.y = (-1.0*z * Math.sin(radians)) + (point.y * Math.cos(radians));
};

/**
 * Utility method to rotate point by Z in a 3D space
 * @private
 */
module.exports.prototype.rotateZ = function(point, radians) {
    var x = point.x;
    point.x = (x * Math.cos(radians)) + (point.y * Math.sin(radians) * -1.0);
    point.y = (x * Math.sin(radians)) + (point.y * Math.cos(radians));
};
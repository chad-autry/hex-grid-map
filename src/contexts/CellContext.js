"use strict";
/**
 * Since only a single constructor is being exported as module.exports this comment isn't documented.
 * The class and module are the same thing, the contructor comment takes precedence.
 * @module CellContext
 */
 
var paper = require('paper/dist/paper-core.js');
var sortedSet = require('collections/sorted-set');
/**

 */
 
/**
 * This is the context object which manages the items in their cells
 * Unlike other contexts, it has two layers it manages, above grid and below grid
 * Produce a Context object for the belowgrid group and mouse interaction
 * @implements {Context}
 * @constructor
 * @param {CellDataSource} cellDataSource - The dataSource of items to draw
 * @param {DrawnItemFactory} drawnItemFactory - The factory which controls how items are drawn
 * @param {integer} stackStep - The distance in pixels to keep between items
 * @param {external:cartesian-hexagonal} hexDimensions - The DTO defining the hex <--> cartesian relation
 */
module.exports = function CellContext(cellDataSource, drawnItemFactory, stackStep, hexDimensions) {
    //Protect the constructor from being called as a normal method
    if (!(this instanceof CellContext)) {
        return new CellContext(cellDataSource, drawnItemFactory, stackStep);
    }
    var context = this;
    this.cellDataSource = cellDataSource;
    this.drawnItemFactory = drawnItemFactory;
    this.dx = 0;
    this.dy = 0;
    this.stackStep = stackStep;
    this.hexDimensions = hexDimensions;
    this.cellGroupsMap = {}; //empty map object to reference the individual cell groups by co-ordinate
    
    /**
     * The context for the below grid items
     * @implements {Context}
     */
    this.belowGridContext = {};
    var cellGroupCompare = function(val1, val2) {
        return val1.zindex - val2.zindex;
    };
    this.zindexSplayTree = sortedSet([], function(val1, val2){ return val1.zindex == val2.zindex;},cellGroupCompare); // A search tree used to keep the individual cell groups sorted for insertion into the parent cell group


    //Add this as a listener to the cell dataSource. this.onCellDataChanged will be called when items change.
    cellDataSource.addListener(this);

    // Documentation inherited from Context#init
    this.init = function(aboveGridGroup) {
        context.aboveGridGroup = aboveGridGroup;
    };
    
    // Documentation inherited from Context#init
    context.belowGridContext.init = function(belowGridGroup) {
        context.belowGridGroup = belowGridGroup;
    };

    // Documentation inherited from Context#mouseDown
    this.mouseDown = function(clickedX, clickedY) {
        return this.hitTest(clickedX, clickedY, context.aboveGridGroup);
    };

    // Documentation inherited from Context#mouseDown
    context.belowGridContext.mouseDown = function(clickedX, clickedY) {
        return context.hitTest(clickedX, clickedY, context.belowGridGroup);
    };

    // Documentation inherited from Context#updatePosition
    this.updatePosition = function(dx, dy) {
        context.aboveGridGroup.position.x = dx;
        context.aboveGridGroup.position.y = dy;
        context.belowGridGroup.position.x = dx;
        context.belowGridGroup.position.y = dy;
        context.dx = dx;
        context.dy = dy;
    };
    
    // Documentation inherited from Context#updatePosition
    context.belowGridContext.updatePosition = function(dx, dy) {
        //No need to actually do anything in the second method
    };

    // Documentation inherited from Context#mouseDragged
    this.mouseDragged = function( x, y, eventDx, eventDy) {
        var clickedGroup = context.clickedGroup;
        //A group is clicked, perform cell item scrolling/dragging

        var dragDy = y - context.clickedY;

        //If trying to scroll upwards past original position, stop at original position
        if (dragDy < this.minGroupDy || clickedGroup.dy + eventDy <= 0) {
            clickedGroup.position.y = clickedGroup.originalYPosition + context.dy; //Still setting the position absolutely, not relative to the cell group's group
            clickedGroup.belowGridGroup.position.y = clickedGroup.position.y;
            clickedGroup.dy = 0;
        } else if(dragDy > this.maxGroupDy || clickedGroup.dy + eventDy > clickedGroup.maxDy) {
            clickedGroup.position.y = clickedGroup.originalYPosition + context.dy + clickedGroup.maxDy; //Still setting the position absolutely, not relative to the cell group's group
            clickedGroup.belowGridGroup.position.y = clickedGroup.position.y;
           clickedGroup.dy = clickedGroup.maxDy;
        } else {
           //Neither too hot, or too cold. Drag the group up or down, and set the item visibillity
            clickedGroup.position.y = clickedGroup.position.y + eventDy;
            clickedGroup.belowGridGroup.position.y = clickedGroup.position.y;
            clickedGroup.dy = clickedGroup.dy + eventDy;
        }
        context.windowCell(clickedGroup);
    };
    
    // Documentation inherited from Context#mouseDragged
    context.belowGridContext.mouseDragged = this.mouseDragged;
    
    // Documentation inherited from Context#mouseReleased
    this.mouseReleased = function(wasDrag) {
        if (!wasDrag && this.clickedItem.data.item.hasOwnProperty('onClick')) {
            this.clickedItem.data.item.onClick();
        }
    };
    
    // Documentation inherited from Context#mouseReleased
    context.belowGridContext.mouseReleased = this.mouseReleased;
    
    // Documentation inherited from Context#reDraw
    this.reDraw = function(screenResized, mapRotated, mapScaled) {
        //Eh, don't do anything yet. Only screen resized implemented which this context doesn't care about
    };
    
    context.belowGridContext.reDraw = this.reDraw;
};

/**
 * Shared logic to hitcheck the items, and set the context with status
 */
module.exports.prototype.hitTest = function(clickedX, clickedY, hitTestGroup) {
    this.clickedY = clickedY;
    var result = hitTestGroup.hitTest(new paper.Point(clickedX, clickedY));
    if (!result) {
        return false;
    }
    var parent = result.item.parent;
    this.clickedItem = result.item;
    while (!parent.hasOwnProperty('aboveGridGroup') && !!parent.parent) {
        this.clickedItem = parent;
        parent = parent.parent;
    }
    //parent is REALLY expected to have an aboveGridGroup property. The second condition of the while was since I didn't like the look of the possibillity of an infinite loop
    this.clickedGroup = parent.aboveGridGroup;
    this.maxGroupDy = this.clickedGroup.maxDy - this.clickedGroup.dy;
    this.minGroupDy = -this.clickedGroup.dy;
    return true;

};

/**
 * Called when objects are added to cells, removed from cells, re-ordered in cells,
 */
module.exports.prototype.onDataChanged = function(event) {
    var changedGroups = {};

    //A reminder for the Author: Javascript variables are not at block level. These variables are used in both loops.
    var i, item, itemGroup, groupKey, cellGroup, drawnItem;
    //Currentlly cell moves are done by re-adding an item with new cell co-ordinates, no z-index param, need to add/re-add all items in the desired order
    //Can do removes individually though

    for (i = 0; i < event.removed.length; i++) {
        item = event.removed[i];
        groupKey = item.u+":"+item.v;
        cellGroup = null;
        if (this.cellGroupsMap.hasOwnProperty(groupKey)) {
            cellGroup = this.cellGroupsMap[groupKey];
        }
        if (!cellGroup) {
            //Invalid item! Throw a hissy fit!
            continue;
        }

        drawnItem = cellGroup.data.drawnItems[item.key];
        drawnItem.remove();
        delete cellGroup.data.drawnItems[item.key];

        drawnItem.previousDrawnItem.nextDrawnItem = drawnItem.nextDrawnItem;
        drawnItem.nextDrawnItem.previousDrawnItem = drawnItem.previousDrawnItem;


        cellGroup.drawnItemCount--;

        //Clean up and delete the empty cellGroups
        if (cellGroup.drawnItemCount === 0) {
            cellGroup.belowGridGroup.remove();
            cellGroup.remove();
            delete this.cellGroupsMap[groupKey];
        } else {
            changedGroups[groupKey] = cellGroup;
        }
    }

    for (i = 0; i < event.added.length; i++) {
        item = event.added[i];
        drawnItem = this.drawnItemFactory.getDrawnItem(item);

        //Get the cell group the drawn item should be a part of
        groupKey = item.u+":"+item.v;
        cellGroup = null;
        if (this.cellGroupsMap.hasOwnProperty(groupKey)) {
                cellGroup = this.cellGroupsMap[groupKey];
        } else {
            //create the above grid and below grid groups
            //keep most of the meta data attached the the above grid group
            cellGroup = new paper.Group();
            cellGroup.pivot = new paper.Point(0, 0);

            //Make a below grid group to handle the Z index of items in the cell below the grid
            var belowGridGroup = new paper.Group();
            belowGridGroup.pivot = new paper.Point(0, 0);

            cellGroup.belowGridGroup = belowGridGroup;
            belowGridGroup.aboveGridGroup = cellGroup;
            cellGroup.aboveGridGroup = cellGroup;

            var pixelCoordinates = this.hexDimensions.getPixelCoordinates(item.u, item.v);
            cellGroup.position = new paper.Point(pixelCoordinates.x + this.dx, pixelCoordinates.y + this.dy);
            belowGridGroup.position = new paper.Point(pixelCoordinates.x + this.dx, pixelCoordinates.y + this.dy);
            this.cellGroupsMap[groupKey] = cellGroup;
                //decorate the cell group with various information we'll need
            cellGroup.mouseDown = false;
            cellGroup.originalXPosition = pixelCoordinates.x;
            cellGroup.originalYPosition = pixelCoordinates.y;
            cellGroup.dy = 0;
            cellGroup.maxDy = 0;
            cellGroup.drawnItemCount = 0;

            //Use a search tree with the unmodified Y co-ord as primary index, and unmodified X coordinate as the secondary
            var zindex = parseFloat(pixelCoordinates.y +"."+pixelCoordinates.x);
            cellGroup.zindex = zindex;
            this.zindexSplayTree.add(cellGroup);
            //Insert group into cellsGroup before the found child
            var node = this.zindexSplayTree.findGreatestLessThan({zindex:zindex});
            if (!!node) {
                cellGroup.insertAbove(node.value);
                belowGridGroup.insertAbove(node.value.belowGridGroup);
            } else {
                this.aboveGridGroup.insertChild(0, cellGroup);
                this.belowGridGroup.insertChild(0, belowGridGroup);
            }

            //Set the doubly linked list references, makes a circle with the cellGroup itself as a node. Means don't need to null check
            cellGroup.previousDrawnItem = cellGroup;
            cellGroup.nextDrawnItem = cellGroup;
            
            //Prepare the map of drawn items by id
            cellGroup.data.drawnItems = {};
        }
        changedGroups[groupKey] = cellGroup;

        //Update the group with the drawn item, all items get added to the top, so must be above grid
        cellGroup.addChild(drawnItem);
        cellGroup.drawnItemCount++;
        //Map the drawn items by id so they can be removed
        if (!!item.key) {
            cellGroup.data.drawnItems[item.key] = drawnItem;
        }
        //some item types include pieces drawn below the grid (let the game logic ensure they are the only item in the cell)
        if (!!drawnItem.data.belowGridItem) {
            cellGroup.belowGridGroup.addChild(drawnItem.data.belowGridItem);
        }
        //Some circular logic here. Pun intended
        cellGroup.previousDrawnItem.nextDrawnItem = drawnItem;
        drawnItem.previousDrawnItem = cellGroup.previousDrawnItem;
        cellGroup.previousDrawnItem = drawnItem;
        drawnItem.nextDrawnItem = cellGroup;
    }

    //For each changed group
    for (var key in changedGroups) {
        if (changedGroups.hasOwnProperty(key)) {
            cellGroup = changedGroups[key];
                
            //Figure out the maxDy
            if (cellGroup.drawnItemCount > 5) {
                cellGroup.maxDy = 5 * (cellGroup.drawnItemCount - 5); //allow to scroll 5 px for each item.outside the allowed window of 5 items

            } else {
                cellGroup.maxDy = 0;
            }

            if (cellGroup.dy > cellGroup.maxDy) {
                   cellGroup.baseGroup.position.y = cellGroup.baseGroup.position.y - (cellGroup.dy - cellGroup.maxDy);
                   cellGroup.dy = cellGroup.maxDy;
            }

            //Reposition each item of the group, according to its index and the new dy
            drawnItem = cellGroup.nextDrawnItem;
            for (i = 0; i < cellGroup.drawnItemCount; i++) {
                    drawnItem.position = new paper.Point(cellGroup.originalXPosition + this.dx, cellGroup.originalYPosition + this.dy + cellGroup.dy - this.stackStep * i);
                    if (!!drawnItem.data.belowGridItem) {
                        drawnItem.data.belowGridItem.position = new paper.Point(cellGroup.originalXPosition + this.dx, cellGroup.originalYPosition + this.dy + cellGroup.dy - this.stackStep * i);
                    }
                    drawnItem = drawnItem.nextDrawnItem;
            }

            //Set the transluceny of each item in the group, and put in the appropriate above/below grid Z index group
            this.windowCell(cellGroup);
        }
    }
    paper.view.update();
};

/**
* The function used to set the transparency of items in a cell with too many to show everything
*
*/
module.exports.prototype.windowCell = function(cellGroup) {
    //re-set items visibillity and opacity
    var windowStartIndex = Math.floor(cellGroup.dy / this.stackStep);
    var drawnItem = cellGroup.nextDrawnItem;
    for (var i = 0; i < cellGroup.drawnItemCount; i++) {
        if (i < windowStartIndex - 5) {
            //Below the window, and the transition
            drawnItem.visible = false;
        } else if (i > windowStartIndex + 9) {
        //Above the window
        drawnItem.visible = false;
        } else if (i < windowStartIndex) {
            //Ensure a part of the below grid group
            cellGroup.belowGridGroup.addChild(drawnItem);
            //Calculate opacity as a percentage of the pixels till out of the window
            drawnItem.visible = true;
            drawnItem.opacity = (1 - ((cellGroup.dy - i * this.stackStep) / (this.stackStep * 6)));
        } else if (i > windowStartIndex + 4) {
            //Ensure a part of the above grid group
            cellGroup.addChild(drawnItem);
            //Calculate opacity as a percentage of the pixels till out of the window
            drawnItem.visible = true;
            drawnItem.opacity = (1 - (((i-4) * this.stackStep - cellGroup.dy) / (this.stackStep * 6)));
        } else {
            //Inside the window
            //Ensure a part of the above grid group
            cellGroup.addChild(drawnItem);
            drawnItem.visible = true;
            drawnItem.opacity = 1;
        }
        drawnItem = drawnItem.nextDrawnItem;
   }
};
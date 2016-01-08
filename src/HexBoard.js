"use strict";
/**
 * Since only a single constructor is being exported as module.exports this comment isn't documented.
 * The class and module are the same thing, the contructor comment takes precedence.
 * @module hexagonal-map
 */
 
var paper = require('browserifyable-paper');
/*
 * Defines an isometric hexagonal board for web games
 */


/**
 * Create a re-useable HexBoard object attached to a canvas.
 * A HexBoard is pretty much the controller of a hexagonal map scene using the context objects and functions
 * @constructor
 * @param canvas - The canvas element to initialize with paper.js
 * @example var hexMap = new (require(hexagonal-map))(canvas);
 */
 module.exports = function HexBoard(canvas) {
    //Protect the constructor from being called as a normal method
    if (!(this instanceof HexBoard)) {
        return new HexBoard(canvas);
    }

    //A reference to the board for functions
    var board = this;

    //Setup paper.js
    paper.setup(canvas);
     
    paper.view.onResize = function(event) {
    
        if (!board.hexDimensions || !board.contexts) {
            return;
        }
  
        //Call each context with redraw, followed by updatePosition
        board.contexts.forEach(function(context) {
            context.reDraw(true, false, false);
        });

        //recenter
        //Figure out what the old U, V in the middle was for our original size
	var hexagonalCoordinates = board.hexDimensions.getReferencePoint(board.dx -Math.floor(board.viewWidth/2),board.dy - Math.floor(board.viewHeight/2));
	board.viewWidth = paper.view.size.width;
        board.viewHeight = paper.view.size.height;
        board.centerOnCell(hexagonalCoordinates.u, hexagonalCoordinates.v);

    };
    
    var tool = new paper.Tool();

    //Set up the psuedo drag for the grid
     tool.onMouseDown = function(e) {
         board.down = true;
         board.mousemoved = false;
         board.latestX = e.point.x;
         board.latestY = e.point.y;
         board.clickedY = e.point.y;
         //Iterate through the contexts in reverse z-index order to see if any of them claim the click event
         for (var i = board.contexts.length - 1; i >= 0; i--) {
             if (board.contexts[i].mouseDown(e.point.x, e.point.y)) {
                 board.mouseDownContext = board.contexts[i];
                 break;
             }
         }
     };


    tool.onMouseMove = function(e) {
        if (board.down === false) {
            return;
        }


        if (!!board.mouseDownContext) {
            //A context has claimed further mouse drag
            board.mouseDownContext.mouseDragged(e.point.x, e.point.y, e.point.x - board.latestX, e.point.y - board.latestY);
        } else {
            //general dragging, translate all cell groups. Position the grid to look infinite
            board.dx = board.dx + e.point.x - board.latestX;
            board.dy = board.dy + e.point.y - board.latestY;
            board.updatePostion();
        }
        board.latestX = e.point.x;
        board.latestY = e.point.y;
        board.mousemoved = true;
        //paper.view.update();
     };

    //TODO onMouseOut does not seem to work. However, mouse events still seem to happen when outside of the paper.js view. So the annoying effects onMouseOut was intended to fix don't show up anyways
    tool.onMouseLeave = function(e) {
        if (board.down === false) {
            return;
        } 
        board.down = false;
        if (!!board.mouseDownContext) {
            board.mouseDownContext.mouseReleased(board.mousemoved);
        } else if (!!board.mouseClicked && !board.mousemoved && !!board.mouseClicked) {
            board.mouseClicked(board.dx, e.point.x, board.dy, e.point.y);
        }
        board.mouseDownContext = null;
        board.mousemoved = false;
    };
    tool.onMouseUp = tool.onMouseLeave;
    
    /**
     * Clears the canvas so the HexBoard may be re-used
     */
    this.clear = function() {
        paper.project.clear();
    };

    /**
     * Initializes the groups and objects from the contexts, plus the drag variables
     */
    this.init = function() {
        //Initialize each context with a group, the contexts should be in the desired z index order
        board.contexts.forEach(function(context) {
            var group = new paper.Group();
            //Set the group pivot points, else paper.js will try to re-compute it to the center
            group.pivot = new paper.Point(0, 0);
            context.init(group);
        });
    
    
        paper.view.draw();
        board.dx = 0; //The current translation in x of the map
        board.dy = 0; // the current translation in y of the map
        board.down = false;
        board.mousemoved = false;
        board.latestX=0;
        board.latestY=0;
        board.clickedY=0;
        board.mouseDownContext = null; //The context which has "claimed" the mouse down event
        board.viewWidth = paper.view.size.width;
        board.viewHeight = paper.view.size.height;
    };

    /**
     * Set the context objects which control layer views and interactions
     * @param { Context[] } contexts - An array of contexts used to control display and interaction with various layers of the map, should be in Z index order
     */
    this.setContexts = function(contexts) {
        board.contexts = contexts;
    };

    /**
     * Set the hexDimensions object used for centering the screen on a cell
     * @param { external:cartesian-hexagonal } hexDimension - The DTO defining the hex <--> cartesian relation
     */
    this.setHexDimensions = function(hexDimensions) {
        board.hexDimensions = hexDimensions;
    };
    
    /**
     * Set the function to be called when no context claims a mouse/touch interaction
     * @param { mouseClicked= } mouseClicked - A mouse clicked callback if no items were clicked
     */
    this.setMouseClicked = function(mouseClicked) {
        board.mouseClicked = mouseClicked;
    };
     
    /**
     * Update x/y positions based on the current dx and dy
     * Will call into the background and foreground update functions
     */
    this.updatePostion = function() {
        board.contexts.forEach(function(context) {
            context.updatePosition(board.dx, board.dy);
        });
    };
     
     /**
      * Utility function to center the board on a cell
      */
     this.centerOnCell = function(u, v) {
         var pixelCoordinates = board.hexDimensions.getPixelCoordinates(u, v);
         board.dx = Math.floor(pixelCoordinates.x + board.viewWidth/2);
         board.dy = Math.floor(pixelCoordinates.y + board.viewHeight/2);
         this.updatePostion();

         paper.view.update();

     };
};
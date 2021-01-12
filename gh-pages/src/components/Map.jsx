import React from "react";
import HexBoard from "../../../src/HexBoard.js";
import BackgroundContext from "../../../src/contexts/RandomStaryBackgroundContext.js";
import ForegroundContext from "../../../src/contexts/LensFlareForegroundContext.js";
import GridContext from "../../../src/contexts/GridContext.js";
import CellContext from "../../../src/contexts/CellContext.js";
import VectorDrawnItemFactory from "../../../src/drawnItemFactories/VectorDrawnItemFactory.js";
import PathDrawnItemFactory from "../../../src/drawnItemFactories/PathDrawnItemFactory.js";
import ArrowDrawnItemFactory from "../../../src/drawnItemFactories/ArrowDrawnItemFactory.js";
import SVGDrawnItemFactory from "../../../src/drawnItemFactories/SVGDrawnItemFactory.js";
import DelegatingDrawnItemFactory from "../../../src/drawnItemFactories/DelegatingDrawnItemFactory.js";
import DrawnItemContext from "../../../src/contexts/DrawnItemContext.js";
import DataSource from "../../../src/dataSources/DataSource.js";
import CellDrawnItemFactory from "../../../src/drawnItemFactories/RegularPolygonDrawnItemFactory";
import SphereDrawnItemFactory from "../../../src/drawnItemFactories/SphereDrawnItemFactory";
import FieldOfSquaresDrawnItemFactory from "../../../src/drawnItemFactories/FieldOfSquaresDrawnItemFactory";
import HexDefinition from "cartesian-hexagonal";
import makeDataLink from "data-chains/src/DataLinkMixin";
import EmittingDataSource from "data-chains/src/EmittingDataSource.js";

/**
 * Factory function, returns a React component given the required params
 * Injecting all dependencies (instead of just using require) since some modules are dynamically loaded
 * And require does not give duplicate objects
 * @param React - React, used to declare the class
 * @param ScenarioService - The scenario service used to for all actions
 */
const Map = class Map extends React.Component {
  constructor(props) {
    super(props);
    // This line is important!
    this.setComponentState = this.setComponentState.bind(this);
    this.baseDataLink = props.dataLink;
  }

  render() {
    return (
      <canvas
        ref={canvasRef => (this.canvasRef = canvasRef)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "black",
          width: "100%",
          height: "100%",
          zIndex: 200
        }}
      />
    );
  }

  resizeCanvas(canvas) {
    /*
    // Lookup the size the browser is displaying the canvas.
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;
    let ctx = canvas.getContext("webgl");
    let dpr = window.devicePixelRatio || 1;
    let bsr =
      ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio ||
      1;

    let ratio = dpr / bsr;

    //Now make the canvas draw at the display size multiplied by the ratio
    canvas.width = displayWidth * ratio;
    canvas.height = displayHeight * ratio;
    */
  }

  componentDidMount() {
    this.resizeCanvas(this.canvasRef);
    let resizeFunction = () => {
      this.resizeCanvas(this.canvasRef);
      //    this.hexBoard.engine.setSize(this.canvasRef.width, this.canvasRef.height);
    };
    this.resizeListener = resizeFunction;
    window.addEventListener("resize", this.resizeListener);
    //babylon.js is controlling the size, force it to resize using our container size when opened
    //            this.props.glContainer.on('open', resizeFunction);

    //babylon.js is controlling the size, force it to resize using our container size on golden-layout resize
    //           this.props.glContainer.on('resize', resizeFunction);

    this.hexBoard = new HexBoard(this.canvasRef);
    //TODO Temp hard coded hexDimensions
    let hexDimensions = new HexDefinition(55, 0.5, 0, 3);
    this.hexBoard.setHexDimensions(hexDimensions);


    let contexts = [];
    contexts.push(new BackgroundContext());
    //Create the cell items datasource, drawnItemFactories, and special compound contex
    let cellDataSource = new DataSource();
    let simpleDrawnItemFactory = new CellDrawnItemFactory(hexDimensions);
    let sphereDrawnItemFactor = new SphereDrawnItemFactory(hexDimensions);
    let arrowDrawnItemFactory = new ArrowDrawnItemFactory(hexDimensions);
    let svgDrawnItemFactory = new SVGDrawnItemFactory(hexDimensions);
    
    //For Asteroids we use brown grey, brownish grey, greyish brown, grey brown. For debris would probablly go more blue-grey
    let asteroidFieldDrawnItemFactory = new FieldOfSquaresDrawnItemFactory(hexDimensions, 9, 20, ["#8d8468", "#86775f", "#7a6a4f", "#7f7053"]);
    let cellDrawnItemFactoryMap = {simple: simpleDrawnItemFactory, sphere: sphereDrawnItemFactor, arrow: arrowDrawnItemFactory, asteroids: asteroidFieldDrawnItemFactory, svg: svgDrawnItemFactory};
    let cellDrawnItemFactory = new DelegatingDrawnItemFactory(cellDrawnItemFactoryMap);
    let cellContext = new CellContext(cellDataSource, cellDrawnItemFactory, 5, hexDimensions);
    
    
    //Push the below grid portion of the cell context
    contexts.push(cellContext.belowGridContext);
    
    //Create and push the grid context
    contexts.push(new GridContext(hexDimensions));

    //Define and push the paths DataSource, DrawnItemFactory, and Context
    let pathDataSource = new DataSource();
    let pathDrawnItemFactory = new PathDrawnItemFactory(hexDimensions);
    contexts.push(new DrawnItemContext(pathDataSource, pathDrawnItemFactory, hexDimensions));
    
    //Definte and push the vector DataSource, DrawnItemFactory, and Context
    let vectorDataSource = new DataSource();
    let vectorDrawnItemFactory = new VectorDrawnItemFactory(hexDimensions);
    contexts.push(new DrawnItemContext(vectorDataSource, vectorDrawnItemFactory, hexDimensions));
    
    //Push the above grid cell context defined earlier
    contexts.push(cellContext);

    //Create and push the LensFlareContext
    contexts.push(new ForegroundContext([{u:0, v:0}], hexDimensions));
    let globalMouseClicked = (dx, x, dy, y) => {
        var hexagonalCoordinates = hexDimensions.getReferencePoint(x - dx, y - dy);
        this.props.addAlert({type:'info', text:'Clicked U:'+hexagonalCoordinates.u + ' V:' +hexagonalCoordinates.v});
    };
    this.hexBoard.setMouseClicked(globalMouseClicked);
    this.hexBoard.setContexts(contexts);

    this.hexBoard.init();

    //And then, setup the demo scene
        
        //Add a star
        //The rotation is the "nearly isometric" converted to radians.
        cellDataSource.addItems([{type:'sphere', size: 100, rotation: 63.435*(Math.PI/180), lineWidth: 3, greatCircleAngles: [-Math.PI/6, Math.PI/6, Math.PI/2], latitudeAngles: [0, Math.PI/6, Math.PI/3, -Math.PI/6], 
        lineColor: 'orange', backgroundColor: 'yellow', borderStar: {radius1: 3, radius2: 6, points: 20, borderColor: 'orange'}, u:0, v:0}]);
        
        //Add a sphere to represent earth
        cellDataSource.addItems([{type:'sphere', size: 66, rotation: 63.435*(Math.PI/180), lineWidth: 3, greatCircleAngles: [-Math.PI/6, Math.PI/6, Math.PI/2], latitudeAngles: [0, Math.PI/6, Math.PI/3, -Math.PI/6], 
        lineColor: '#653700', backgroundColor: 'blue', borderWidth: 2, borderColor: 'white', u:5, v:5}]);
        
        //Add a sphere to represent the moon
        cellDataSource.addItems([{type:'sphere', size: 33, rotation: 63.435*(Math.PI/180), lineWidth: 2, greatCircleAngles: [-Math.PI/6, Math.PI/6, Math.PI/2], latitudeAngles: [0, Math.PI/6, Math.PI/3, -Math.PI/6], 
        lineColor: 'grey', backgroundColor: '#E1E1D6', borderWidth: 3, borderColor: 'black', u:3, v:8}]);
        
        
        
        //Add arrows to represent gravity
        //Gravity around the sun
        cellDataSource.addItems([{type:'arrow', u: 0, v: -1, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 180, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: -1, v: 0, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 240, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: -1, v: 1, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 300, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 0, v: 1, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 0, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 1, v: 0, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 60, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 1, v: -1, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 120, scaleLength: 0.75, scaleWidth:0.75}]);
        
        //gravity around the planet
        cellDataSource.addItems([{type:'arrow', u: 5, v: 4, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 180, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 4, v: 5, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 240, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 4, v: 6, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 300, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 5, v: 6, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 0, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 6, v: 5, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 60, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 6, v: 4, fillColor: 'grey', lineWidth: 0, lineColor: 'grey', rotation: 120, scaleLength: 0.75, scaleWidth:0.75}]);
        
        //unfilled gravity around the moon
        cellDataSource.addItems([{type:'arrow', u: 3, v: 7, fillColor: 'black', lineWidth: 3, lineColor: 'grey', rotation: 180, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 2, v: 8, fillColor: 'black', lineWidth: 3, lineColor: 'grey', rotation: 240, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 2, v: 9, fillColor: 'black', lineWidth: 3, lineColor: 'grey', rotation: 300, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 3, v: 9, fillColor: 'black', lineWidth: 3, lineColor: 'grey', rotation: 0, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 4, v: 8, fillColor: 'black', lineWidth: 3, lineColor: 'grey', rotation: 60, scaleLength: 0.75, scaleWidth:0.75}]);
        cellDataSource.addItems([{type:'arrow', u: 4, v: 7, fillColor: 'black', lineWidth: 3, lineColor: 'grey', rotation: 120, scaleLength: 0.75, scaleWidth:0.75}]);
        
        //Add a fleet of red 'ships' (triangles) on the dark side of the moon, and a fleet of green ships at the sun
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:1, v:0}, {type:'simple', radius: 30, sides: 3, color: 'red', u:2, v:9}]);
        
        //A small asteroid field. Double asteroids in the middle
        var onClickAsteroids = () =>  {
          this.props.addAlert({type:'success', text:"Asteroids"});
        };
        cellDataSource.addItems([{type:'asteroids', u:-1, v:10, onClick:onClickAsteroids}, {type:'asteroids', u:-2, v:10, onClick:onClickAsteroids},{type:'asteroids', u:-3, v:10, onClick:onClickAsteroids}]);
        cellDataSource.addItems([{type:'asteroids', u:-3, v:11, onClick:onClickAsteroids}, {type:'asteroids', u:-2, v:11, onClick:onClickAsteroids},{type:'asteroids', u:-2, v:10, onClick:onClickAsteroids}]);
        cellDataSource.addItems([{type:'asteroids', u:-1, v:9, onClick:onClickAsteroids}, {type:'asteroids', u:-2, v:9, onClick:onClickAsteroids}]);
        
//A svg rocket
var onClickSVG = () => {
  this.props.addAlert({type:'success', text:"Now with SVG Support!"});
};
let rocketSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 640 512"><!-- Font Awesome Pro 5.15.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M592.604 208.244C559.735 192.836 515.777 184 472 184H186.327c-4.952-6.555-10.585-11.978-16.72-16H376C229.157 137.747 219.403 32 96.003 32H96v128H80V32c-26.51 0-48 28.654-48 64v64c-23.197 0-32 10.032-32 24v40c0 13.983 8.819 24 32 24v16c-23.197 0-32 10.032-32 24v40c0 13.983 8.819 24 32 24v64c0 35.346 21.49 64 48 64V352h16v128h.003c123.4 0 133.154-105.747 279.997-136H169.606c6.135-4.022 11.768-9.445 16.72-16H472c43.777 0 87.735-8.836 120.604-24.244C622.282 289.845 640 271.992 640 256s-17.718-33.845-47.396-47.756zM488 296a8 8 0 0 1-8-8v-64a8 8 0 0 1 8-8c31.909 0 31.942 80 0 80z"/></svg>`;
cellDataSource.addItems([{type:'svg', scale: .5, svg: rocketSVG, u:3, v:3, rotation: -60, onClick:onClickSVG}]);


        //A blue 'space station'
        var onClickStation = () => {
          this.props.addAlert({type:'success', text:"Do you believe I'm a space station? Use your imagination"});
        };
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 5, color: 'blue', u:6, v:5, onClick:onClickStation}]);
        
        
        //Dave
        let isDaveGoing = false;
        var onClickDave = () => {
            if (!isDaveGoing) {
               isDaveGoing = true;
               vectorDataSource.addItems([{id:'daveVelocity', shaftWidth: 5, color: 'green', sourceU:0, sourceV:4, destU:0, destV:6}]);
               this.props.addAlert({type:'success', text:'This is Dave. Dave is going places. Go Dave, go.'});
	    } else {
	       isDaveGoing = false;
	       this.props.addAlert({type:'warning', text:'Dave, slow down man.'});
	    
	       vectorDataSource.removeItems([{id:'daveVelocity'}]);
	    }
        };
        
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'green', u:0, v:4, onClick:onClickDave}]);

        //Poetry
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'white', u:3, v:0, onClick:() => {this.props.addAlert({type:'info', text:'One ship'});}}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'white', u:4, v:0, onClick:() => {this.props.addAlert({type:'info', text:'Two ship'});}}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'white', u:4, v:0, onClick:() => {this.props.addAlert({type:'info', text:'Two ship'});}}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'red', u:5, v:0, onClick:() => {this.props.addAlert({type:'info', text:'Red ship'});}}]);
        cellDataSource.addItems([{type:'simple', radius: 30, sides: 3, color: 'blue', u:6, v:0, onClick:() => {this.props.addAlert({type:'info', text:'Blue ship'});}}]);
        
        //A path around the Sun, Could represent the danger area for radiation
        pathDataSource.addItems([{width: 5, color: 'orange', closed: true, points: [[0,-2],[-2, 0],[-2, 2],[0, 2],[2, 0],[2, -2]], onClick:() => {this.props.addAlert({type:'warning', text:'Radiation! Beware!'});}}]);
  }

  componentWillUnmount() {
    //            this.props.glEventHub.off( 'map-state-changed', this.setComponentState );
    window.removeEventListener("resize", this.resizeListener);
    this.hexBoard.clear();
    this.hexBoard.paper.tool.remove();
  }

  setComponentState(mapState) {
    this.baseDataLink.addItems(mapState);
  }

  UNSAFE_componentWillUpdate(nextProps, nextState) {
    // When a new state comes in, update the map component's baseDataLink
    if (nextState) {
      this.baseDataLink.addItems(nextState);
    }
  }
};

export default Map;

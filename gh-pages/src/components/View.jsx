import React from "react";
import DataSource from "hex-grid-map/src/dataSources/DataSource.js";
import Map from "./Map.jsx";
import { Route, Switch, Link, Redirect } from "react-router-dom";

/**
 * The view component is responsible for making requests and populating the datasource for the Map and Table child components
 */
const View = class View extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      map: true,
      table: false,
      system: true,
      galaxy: false,
      hasMore: false,
      latestTurn: 0,
      turn: 0
    };
    this.baseDataLink = new DataSource();

    this.query = this.query.bind(this);
    this.collectAndQuery = this.collectAndQuery.bind(this);
    this.more = this.more.bind(this);
  }

  render() {
    return (
      <div>
        <Switch>
          <Route exact path="/view">
            <Redirect to="/view/map" />
          </Route>
          <Route
            path="/view/map"
            render={routeProps => (
              <Map 
              addAlert={this.props.addAlert} dataLink={this.baseDataLink} {...routeProps} />
            )}
          />
        </Switch>
      </div>
    );
  }

  componentDidMount() {
    // Fetch the latest turn
    this.query({ turn: "latest", system: "0:0" });
  }

  collectAndQuery() {}

  more() {}
  /*
   * Use the fetch service to get map/list data
   */
  query(props) {
    
  }
};

export default View;

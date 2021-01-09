import NavBar from "./NavBar.jsx";
import Alerts from "./Alerts.jsx";
import React from "react";
import Measure from "react-measure";
import { Route, Redirect, Switch } from "react-router-dom";
import View from "./View.jsx";
//import Jsdoc from "./Jsdoc.jsx";

const AppRoot = class AppRoot extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alerts: []
    };
    // This line is important!
    this.setNavHeight = this.setNavHeight.bind(this);
    this.removeAlert = this.removeAlert.bind(this);
    this.addAlert = this.addAlert.bind(this);
  }

  setNavHeight(navbarHeight) {
    this.setState({
      navbarHeight: navbarHeight
    });
  }

  removeAlert(index) {
    let alerts = this.state.alerts;
    alerts.splice(index, 1);
    this.setState({ alerts: alerts });
  }

  addAlert(alert) {
    let alerts = this.state.alerts;
    alerts.push(alert);
    this.setState({ alerts: alerts });
  }

  render() {
    return (
      <div>
        <Measure onMeasure={dimensions => this.setNavHeight(dimensions.height)}>
          <div style={{ marginBottom: 20 + "px" }}>
            <NavBar
              setNavHeight={this.setNavHeight}
              location={this.props.location}
            />
            {this.state.alerts.length > 0 && (
              <Alerts
                removeAlert={this.removeAlert}
                alerts={this.state.alerts}
              />
            )}
          </div>
        </Measure>
        <Switch>
          <Route
            path="/view"
            render={routeProps => (
              <View 
              addAlert={this.addAlert} {...routeProps} />
            )}
          />
          <Route path="/Jsdoc" component={View} />
          <Redirect from="*" to="/view/map" />
        </Switch>
      </div>
    );
  }
};

export default AppRoot;

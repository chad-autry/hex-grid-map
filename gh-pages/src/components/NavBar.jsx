import React from "react";
import NavItem from "./NavItem.jsx";

/**
 * Create a React component for the NavBar
 * The only state it contains is if it is collapsed or not
 * It is passed in authentication, and route state for display
 */
const NavBar = class NavBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = { menuCollapsed: true };
    // This line is important!
    this.menuClicked = this.menuClicked.bind(this);
  }

  menuClicked() {
    this.setState({
      menuCollapsed: !this.state.menuCollapsed
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Don't blow the stack out by re-rendering when this components height is set to the parent
    return (
      this.props.isAuthenticated != nextProps.isAuthenticated ||
      this.state.menuCollapsed != nextState.menuCollapsed ||
      this.props.location.pathname != nextProps.location.pathname
    );
  }

  render() {
    return (
      <div className="navbar navbar-default" style={{ zIndex: 300 }}>
        <div className="navbar-header" onClick={this.menuClicked}>
          <div className="navbar-toggle">
            <span className="sr-only">Toggle navigation</span>
            <i
              className={
                this.state.menuCollapsed
                  ? "fa fa-chevron-right"
                  : "fa fa-chevron-down"
              }
            />
          </div>
          <div className="navbar-brand">
          hex-grid-map
          </div>
        </div>
        {/*Programatically controll hiding the collapse using react.
                    Due to hdpi devices, we're collapsible on both on both xs and sm screens */}
        <div
          className={
            this.state.menuCollapsed
              ? "navbar-collapse hidden-xs hidden-sm"
              : "navbar-collapse"
          }>
          <ul className="nav navbar-nav">
            <NavItem to="/view" location={this.props.location}>
              <i className="fa fa-eye" /> View
            </NavItem>
            <NavItem to="/jsdocs" location={this.props.location}>
              <i className="fa fa-book" /> JSDoc
            </NavItem>
            <li>
              <a href="https://github.com/chad-autry/hex-grid-map">
                <i className="fa fa-github-alt" /> Github
              </a>
            </li>
            <li>
              <a href="https://github.com/chad-autry/hex-grid-map/issues">
                <i className="fa fa-comments" /> Support
              </a>
            </li>
          </ul>
        </div>
      </div>
    );
  }
};

export default NavBar;

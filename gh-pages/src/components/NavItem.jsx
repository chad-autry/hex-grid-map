import React from "react";
import { Link, Route } from "react-router-dom";

const NavItem = ({ to, children, ...rest }) => (
  <Route
    path={to}
    children={({ match }) => (
      <li className={match ? "active" : ""}>
        <Link to={to} children={children} />
      </li>
    )}
    {...rest}
  />
);

export default NavItem;

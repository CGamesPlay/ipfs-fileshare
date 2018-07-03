import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import { HashRouter, Link } from "react-router-dom";
import { Switch, Route } from "react-router";
import DeafSandstorm from "./DeafSandstorm";

const message = "This is my really great message";
//DeafSandstorm.upload(message).then(result => console.log(result));
DeafSandstorm.download({
  key: "67XbMS6gcD3atDKfVkg9fpHb534UD9n6UXSnoxCUkbXu",
  hash: "Qma67Q28LEoQ5ibojCJaWnVE1VeR6QKXVxUciWycMnWHq6",
}).then(result => console.log(new TextDecoder().decode(result)));

class Home extends React.Component {
  render() {
    return (
      <p className="App-intro">
        To get started, edit <code>src/App.js</code> and save to reload.
        <Link to="/about">About this</Link>
      </p>
    );
  }
}

const About = () => <p className="App-intro">This is the about page.</p>;

class App extends Component {
  render() {
    return (
      <HashRouter hashType="noslash">
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to React</h1>
          </header>
          <Switch>
            <Route exact path="/" component={Home} />
            <Route exact path="/about" component={About} />
          </Switch>
        </div>
      </HashRouter>
    );
  }
}

export default App;

import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import { Component } from 'react';
import axios from 'axios';
export default class App extends Component {
  constructor(){
    super()
    this.state = {
      currentTime: 0
    }
    this.callApi = this.callApi.bind(this);
  }
  componentWillMount(){
    fetch('/time').then(res => res.json()).then(data => {
      this.setState({currentTime: data.time})
    });
  }
  callApi(){
    // fetch('/help').then(res => res.json()).then(data => {
    //   this.setState({currentTime: data.time})
    // });
    axios.post('/help',{name: "Sukhman"})
    .then(res => {
      let data = res.data;
      this.setState({currentTime: data.time})
    }, (error) => {
      console.log(error);
    })
  }
  render(){
    return (
      <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <p onClick={this.callApi}>The current time is {this.state.currentTime}.</p>
      </header>
    </div>
    )
  }
}

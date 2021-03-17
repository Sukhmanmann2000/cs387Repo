import React, { useState, useEffect } from 'react';
import './css/login.css';
import { Component } from 'react';
import axios from 'axios';
export default class Login extends Component {
  constructor(){
    super()
    this.state = {
      username: "",
      password: "",
      errorMessage: ""
    }
    this.loginUser = this.loginUser.bind(this);
  }
  componentDidMount(){
    fetch('/checkUserLoggedIn').then(res => res.json()).then(data => {
      if (data.isUserLoggedIn)
        window.location.href = "/home";
    });
  }
  loginUser() {
    if (!this.state.username || !this.state.password){
      this.setState({errorMessage: "Please enter the required Details"});
      return;
    }
    axios.post('/loginUser',{username: this.state.username, password: this.state.password})
    .then(res => {
      let data = res.data;
      if (data.loggedIn){
        
        this.setState({errorMessage: ""});
        window.location.href = "/home";
      }
      else{
        this.setState({errorMessage: data.loginerror});
      }
    }, (error) => {
      console.log(error);
    })
  }
  render(){
    return (
      <div className="login">
        <div className="loginHeader">
          Recommender System
        </div>
        <div style={{width: "100%",display: "flex", flexDirection: "row",justifyContent: "center",marginTop: "5%"}}>
          <div className="homeLogin">
            <div style={{width: "100%",textAlign: "center", fontSize: "25px", fontWeight: "bold", color: "orange"}}>
              Login
            </div>
            {this.state.errorMessage ? <div className="loginError">
              {this.state.errorMessage}
            </div> : null}
            <div className="loginText">
              Username:
            </div>
            <input type="text" className="loginInput" placeholder="Enter Username" onChange={(e) => {this.setState({username: e.target.value})}}></input>
            <div className="loginText">
              Password:
            </div>
            <input type="Password" className="loginInput" placeholder="Enter Password" onChange={(e) => {this.setState({password: e.target.value})}}></input>
            <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "5%"}}>
              <button className="loginSubmit" onClick={this.loginUser}>Log In</button>
            </div>
            <div style={{width: "100%", marginTop: "3%", textAlign: "center", fontSize: "17px", fontWeight: "500"}}>
              Don't have and account? <a href="/register">Sign Up</a>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

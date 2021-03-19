import React, { useState, useEffect } from 'react';
import './css/login.css';
import { Component } from 'react';
import axios from 'axios';
import Select from 'react-select';

const customSelectStyle = {
    control: styles => ({ ...styles, backgroundColor: 'white', fontWeight: "500" }),
    option: (styles, { data, isDisabled, isFocused, isSelected }) => {
        return {
        ...styles,
        fontWeight: "500",
        color: "black",
        cursor: isDisabled ? 'not-allowed' : 'default',
        };
    },
}
export default class Register extends Component {
  constructor(){
    super()
    this.state = {
      username: "",
      password: "",
      name: "",
      gender: "",
      dob: "",
      errorMessage: ""
    }
    this.registerUser = this.registerUser.bind(this);
  }
  componentDidMount(){
    fetch('/checkUserLoggedIn').then(res => res.json()).then(data => {
      if (data.isUserLoggedIn){
        if (data.isAdmin)
          window.location.href = "/adminHome";
        else if (data.isCritic)
          window.location.href = "/criticHome";
        else
          window.location.href = "/home";
      }
    });
  }
  registerUser() {
    if (!this.state.username || !this.state.password || !this.state.name || !this.state.gender || !this.state.dob){
        this.setState({errorMessage: "Please enter the required Details"});
        return;
    }
    else if (this.state.username.includes(" ")){
        this.setState({errorMessage: "Username must not have spaces"});
        return;
    }
    else if (this.state.password.length < 5){
        this.setState({errorMessage: "Password must be atleast 5 characters long"});
        return;
    }
    axios.post('/registerUser',{
        username: this.state.username, 
        password: this.state.password,
        name: this.state.name,
        gender: this.state.gender,
        dob: this.state.dob
    })
    .then(res => {
      let data = res.data;
      if (data.loggedIn){
        this.setState({errorMessage: ""});
        if (data.isAdmin)
          window.location.href = "/adminHome";
        else if (data.isCritic)
          window.location.href = "/criticHome";
        else
          window.location.href = "/home";
      }
      else{
        this.setState({errorMessage: data.registererror});
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
              Register
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
            <div className="loginText">
              Name:
            </div>
            <input type="text" className="loginInput" placeholder="Enter your Full Name" onChange={(e) => {this.setState({name: e.target.value})}}></input>
            <div className="loginText" style={{marginBottom: "2%"}}>
                Gender:
            </div>
            <Select styles={customSelectStyle} 
                options={[{value: 'Male', label: 'Male'},{value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}]}
                label="Select Gender"
                placeholder = "Select Gender"
                onChange = {(e) => {this.setState({gender: e.value})}}
            />
            <div className="loginText">
              Date of Birth:
            </div>
            <input type="date" placeholder="Select Date of Birth" onChange={(e) => {this.setState({dob: e.target.value})}} className="loginInput"></input>
            <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "5%"}}>
              <button className="loginSubmit" onClick={this.registerUser}>Sign Up</button>
            </div>
            <div style={{width: "100%", marginTop: "3%", textAlign: "center", fontSize: "17px", fontWeight: "500"}}>
              Already have an account? <a href="/login">Login</a>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

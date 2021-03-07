import React, { useState, useEffect } from 'react';
import { Component } from 'react';
import axios from 'axios';
export default class Home extends Component{
    constructor(){
        super()
        this.state = {

        }
        this.logoutUser = this.logoutUser.bind(this)
    }
    componentWillMount(){
        fetch('/checkUserLoggedIn').then(res => res.json()).then(data => {
            if (!data.isUserLoggedIn)
                window.location.href = "/login";
        });
    }
    logoutUser(){
        axios.post('/logoutUser',{})
        .then(res => {
        let data = res.data;
        if (data.loggedOut){
            window.location.href = "/login";
        }
        }, (error) => {
            console.log(error);
        })
    }
    render() {
        return (
            <div>
                <div>
                This is Home
                </div>
                <button onClick={this.logoutUser}>Logout</button>
            </div>
        )
    }
}
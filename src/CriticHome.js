import React from 'react';
import './css/home.css'
import './css/criticHome.css'
import { Component } from 'react';
import axios from 'axios';
import MovieCard from './MovieCard'
import search from './static/search.png'
import { Dialog, FormControl, RadioGroup, FormControlLabel, Radio } from '@material-ui/core';

export default class CriticHome extends Component{
    constructor(){
        super();
        this.state = {
            username: "",
            isUserLoggedIn: false,
            movieList: [],
            genreList: [],
            selectedGenres: {},
            movieTitle: "",
            movieYear: "",
            movieURL: "",
            movieRating: "",
            movieDuration: "",
            searchOption: "Title",
            addMovieErrorMessage: ""
        }
        this.logoutUser = this.logoutUser.bind(this);
        this.handleGenreSelect = this.handleGenreSelect.bind(this);
        this.handleSearchOptionChange = this.handleSearchOptionChange.bind(this);
    }
    componentDidMount(){
        fetch('/getUserDetails').then(res => res.json()).then(data => {
            if (!data.isUserLoggedIn)
                window.location.href = "/login";
            else if (data.isAdmin)
                window.location.href = "/adminHome";
            else if (!data.isCritic)
                window.location.href = "/home";
            else
                this.setState({username: data.username, isUserLoggedIn: true});
        });
        fetch('/getAllGenres').then(res => res.json()).then(data => {
            this.setState({genreList: data.genreList});
            var tempDic = {};
            for (let x of data.genreList){
                tempDic[x.genre_id] = false;
            }
            this.setState({selectedGenres: tempDic});
        });
        fetch('/getMovieList').then(res => res.json()).then(data => {
            this.setState({movieList: data.movieList});
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
    handleGenreSelect(e){
        var tempDic = this.state.selectedGenres;
        tempDic[e.genre_id] = !tempDic[e.genre_id];
        this.setState({selectedGenres: tempDic});
    }
    handleSearchOptionChange(e){
        this.setState({searchOption: e.target.value});
    }
    render(){
        if (!this.state.isUserLoggedIn)
            return (<div></div>)
        var movieElement = this.state.movieList.map((e,id) => {return (<MovieCard movieDic={e}/>)});
        var searchText = "Search Movies by " + this.state.searchOption;
        return (
            <div className="home">
                <div className="homeHeading">
                    Recommender System
                </div>
                <div className="welcomeText">
                    Welcome <b style={{fontWeight: "500", color: "#33CC00"}}>{this.state.username}</b>
                </div>
                <div className="homeLogoutDiv" onClick={this.logoutUser}>
                    Logout
                </div>
                <div className="bottomContainer">
                    <div className="criticHomeMoviesPanel">
                        <div className="searchMovieDiv">
                            <input className="criticHomeSearchMovie" placeholder={searchText} type="text"></input>
                            <div className="criticHomeSearchMovieIcon">
                                <img style={{width:"100%"}} src={search}></img>
                            </div>
                        </div>
                        <div className="recommendationHeader">
                            <div style={{backgroundColor: "white", padding: "10px", width: "100%", borderRadius: "6px", textAlign: "center"}}>All Movies&nbsp;&nbsp;</div>
                        </div>
                        <div style={{width: "100%", display: "flex", justifyContent: "center"}}>
                            <div className="criticHomeMovieListPanel">
                                {movieElement}
                            </div>
                        </div>
                    </div>
                    <div className="criticHomeAddMoviePanel">
                        <div style={{width: "100%"}}>
                            <div className="searchOptionHeader">Search Option</div>
                            <div style={{width: "100%", display: 'flex', justifyContent: "center"}}>
                                <FormControl component="fieldset">
                                    <RadioGroup row aria-label="position" name="position" defaultValue="top">
                                        <FormControlLabel
                                            checked={this.state.searchOption === "Title"}
                                            value="Title"
                                            control={<Radio color="primary" />}
                                            label="By Title"
                                            labelPlacement="top"
                                            onChange={this.handleSearchOptionChange}
                                        />
                                        <FormControlLabel
                                            checked={this.state.searchOption === "Actor"}
                                            value="Actor"
                                            control={<Radio color="primary" />}
                                            label="By Actor"
                                            labelPlacement="top"
                                            onChange={this.handleSearchOptionChange}
                                        />
                                        <FormControlLabel
                                            checked={this.state.searchOption === "Director"}
                                            value="Director"
                                            control={<Radio color="primary" />}
                                            label="By Director"
                                            labelPlacement="top"
                                            onChange={this.handleSearchOptionChange}
                                        />
                                        <FormControlLabel
                                            checked={this.state.searchOption === "Year"}
                                            value="Year"
                                            control={<Radio color="primary" />}
                                            label="By Year"
                                            labelPlacement="top"
                                            onChange={this.handleSearchOptionChange}
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                            <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "2%"}}>
                            <div className="criticHomeAddMovieDiv">
                                <div style={{width: "96%", padding: "2% 0%"}}>
                                    <div style={{width: "100%",textAlign: "center", fontSize: "25px", fontWeight: "bold", color: "orange"}}>
                                        Add Movie
                                    </div>
                                    {this.state.addMovieErrorMessage ? <div className="criticHomeAddMovieError">
                                        {this.state.addMovieErrorMessage}
                                    </div> : null}
                                    <div className="criticHomeAddMovieLabel">
                                        Title:
                                    </div>
                                    <input type="text" className="criticHomeAddMovieInput" placeholder="Enter Title" value={this.state.movieTitle} onChange={(e) => {this.setState({movieTitle: e.target.value})}}></input>
                                    <div className="criticHomeAddMovieLabel">
                                        Year Released:
                                    </div>
                                    <input type="number" step="1" className="criticHomeAddMovieInput" placeholder="Enter Year Released" value={this.state.movieYear} onChange={(e) => {this.setState({movieYear: e.target.value})}}></input>
                                    <div className="criticHomeAddMovieLabel">
                                        Select Genres:
                                    </div>
                                    <div className="addMovieGenreListBoundary">
                                        <div className="addMovieGenreListDiv">
                                            {this.state.genreList.map((e,id) => {return (
                                                <div className="addMovieGenreElement" 
                                                onClick={() => {this.handleGenreSelect(e)}} 
                                                style={this.state.selectedGenres[e.genre_id]? {backgroundColor: e.color, color: "white"} : {backgroundColor: "white", color: "black"}}
                                                >
                                                    {e.genre}
                                                </div>   
                                            )})}
                                        </div>
                                    </div>
                                    <div className="criticHomeAddMovieLabel">
                                        Movie URL:
                                    </div>
                                    <input type="text" className="criticHomeAddMovieInput" placeholder="Enter Movie URL" value={this.state.movieURL} onChange={(e) => {this.setState({movieURL: e.target.value})}}></input>
                                    <div style={{width: "96%", display: "flex", flexDirection: "row", justifyContent: "space-between",marginTop: "1%"}}>
                                        <div style={{width: "48%"}}>
                                            <div className="criticHomeAddMovieLabel">
                                                Critic Rating:
                                            </div>
                                            <input type="number" step="0.01" placeholder="Enter Critic Rating" value={this.state.movieRating} onChange={(e) => {this.setState({movieRating: e.target.value})}} className="criticHomeAddMovieInput"></input>
                                        </div>
                                        <div style={{width: "48%"}}>
                                            <div className="criticHomeAddMovieLabel">
                                                Duration (mins):
                                            </div>
                                            <input type="number" step="1" placeholder="Enter Movie Duration" value={this.state.movieDuration} onChange={(e) => {this.setState({movieDuration: e.target.value})}} className="criticHomeAddMovieInput"></input>
                                        </div>
                                    </div>
                                    <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "5%"}}>
                                        <button className="loginSubmit">Add Movie</button>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}
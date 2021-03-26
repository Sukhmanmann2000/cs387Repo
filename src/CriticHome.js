import React from 'react';
import './css/home.css'
import './css/criticHome.css'
import { Component } from 'react';
import axios from 'axios';
import MovieCard from './MovieCard'
import search from './static/search.png'
import { Dialog, FormControl, RadioGroup, FormControlLabel, Radio } from '@material-ui/core';
import Pagination from '@material-ui/lab/Pagination';

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
            movieDirector: "",
            movieActor: "",
            movieActorList: [],
            criticHomeSearchText: "",
            searchOption: "Title",
            addMovieErrorMessage: "",
            totalPages: 1,
            currentPage: 1
        }
        this.logoutUser = this.logoutUser.bind(this);
        this.handleGenreSelect = this.handleGenreSelect.bind(this);
        this.handleSearchOptionChange = this.handleSearchOptionChange.bind(this);
        this.addActor = this.addActor.bind(this);
        this.addMovie = this.addMovie.bind(this);
        this.getMovieListCritic = this.getMovieListCritic.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
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
                tempDic[x.name] = false;
            }
            this.setState({selectedGenres: tempDic});
        });
        this.getMovieListCritic();
    }
    getMovieListCritic(){
        axios.post('/getMovieListCritic',{searchText: this.state.criticHomeSearchText, searchOption: this.state.searchOption, currentPage: this.state.currentPage})
        .then(res => {
            let data = res.data;
            if (data.success){
                this.setState({movieList: data.movieList, totalPages: data.totalPages});
            } else {
                alert(data.error);
            }
        }, (error) => {
            console.log(error);
        })
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
    addActor(){
        var actorList = this.state.movieActorList;
        actorList.push(this.state.movieActor);
        this.setState({movieActorList: actorList, movieActor: ""});
    }
    addMovie(){
        if (!this.state.movieTitle ||
            !this.state.movieYear ||
            !this.state.movieDirector ||
            !this.state.movieRating ||
            this.state.movieActorList.length==0){
                alert("Please Enter Correct Input");
                return;
            }
        var tempList = [];
        for (let key in this.state.selectedGenres){
            if (this.state.selectedGenres[key])
                tempList.push(key);
        }
        if (tempList.length==0){
            alert("Please select atleast 1 Genre");
            return;
        }
        axios.post('/addMovie',{
            title: this.state.movieTitle,
            year: this.state.movieYear,
            url: this.state.movieURL,
            rating: this.state.movieRating,
            duration: this.state.movieDuration,
            director: this.state.movieDirector,
            actorList: this.state.movieActorList,
            genreList: tempList
        })
        .then(res => {
            let data = res.data;
            if (data.success){
                alert("Movie Added Successfully!");
                this.setState({
                    movieTitle: "",
                    movieYear: "",
                    movieURL: "",
                    movieRating: "",
                    movieDuration: "",
                    movieDirector: "",
                    movieActor: "",
                    movieActorList: [],
                    selectedGenres: {}
                },this.getMovieListCritic);
            }
            else{
                alert(data.error)
            }
        }, (error) => {
            console.log(error);
        })
    }
    handleGenreSelect(e){
        var tempDic = this.state.selectedGenres;
        tempDic[e.name] = !tempDic[e.name];
        this.setState({selectedGenres: tempDic});
    }
    handleSearchOptionChange(e){
        this.setState({searchOption: e.target.value});
    }
    handlePageChange(event, value){
        this.setState({currentPage: value}, this.getMovieListCritic);
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
                        <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "row"}}>
                            <div style={{width: "80%", height: "100%"}}>
                                <div className="searchMovieDiv">
                                    <input className="criticHomeSearchMovie" placeholder={searchText} type="text" onChange={(e) => {this.setState({criticHomeSearchText: e.target.value})}}></input>
                                    <div className="criticHomeSearchMovieIcon">
                                        <img style={{width:"100%"}} src={search} onClick={this.getMovieListCritic}></img>
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
                                <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "2%"}}>
                                    <Pagination count={this.state.totalPages} page={this.state.currentPage} onChange={this.handlePageChange} color="primary" variant="outlined" shape="rounded" />
                                </div>
                            </div>
                            <div style={{width: "20%", height: "100%", display: "flex", alignItems: "center"}}>
                                <div style={{width: '100%'}}>
                                    <div className="searchOptionHeader">Search Option</div>
                                    <div style={{width: "100%"}}>
                                        <FormControl component="fieldset">
                                            <RadioGroup row aria-label="position" name="position" defaultValue="right">
                                                <div style={{width: "100%",display: "flex", flexDirection: "row"}}>
                                                    <div style={{width: "50%", textAlign: "right"}}>
                                                        <FormControlLabel
                                                            checked={this.state.searchOption === "Title"}
                                                            value="Title"
                                                            control={<Radio color="primary" />}
                                                            onChange={this.handleSearchOptionChange}
                                                        />
                                                        </div>
                                                    <div style={{width: "50%", display: "flex", alignItems: "center", marginLeft: "-9%"}}>By Title</div>
                                                </div>
                                                <div style={{width: "100%",display: "flex", flexDirection: "row"}}>
                                                    <div style={{width: "50%", textAlign: "right"}}>
                                                        <FormControlLabel
                                                            checked={this.state.searchOption === "Actor"}
                                                            value="Actor"
                                                            control={<Radio color="primary" />}
                                                            onChange={this.handleSearchOptionChange}
                                                        />
                                                    </div>
                                                    <div style={{width: "50%", display: "flex", alignItems: "center", marginLeft: "-9%"}}>By Actor</div>
                                                </div>
                                                <div style={{width: "100%",display: "flex", flexDirection: "row"}}>
                                                    <div style={{width: "50%", textAlign: "right"}}>
                                                        <FormControlLabel
                                                            checked={this.state.searchOption === "Director"}
                                                            value="Director"
                                                            control={<Radio color="primary" />}
                                                            onChange={this.handleSearchOptionChange}
                                                        />
                                                    </div>
                                                    <div style={{width: "50%", display: "flex", alignItems: "center", marginLeft: "-9%"}}>By Director</div>
                                                </div>
                                                <div style={{width: "100%",display: "flex", flexDirection: "row"}}>
                                                    <div style={{width: "50%", textAlign: "right"}}>
                                                        <FormControlLabel
                                                            checked={this.state.searchOption === "Year"}
                                                            value="Year"
                                                            control={<Radio color="primary" />}
                                                            onChange={this.handleSearchOptionChange}
                                                        />
                                                    </div>
                                                    <div style={{width: "50%", display: "flex", alignItems: "center", marginLeft: "-9%"}}>By Year</div>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="criticHomeAddMoviePanel">
                        <div style={{width: "100%"}}>
                            <div style={{width: "100%", display: "flex", justifyContent: "center"}}>
                            
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
                                    <div style={{width: "97%", display: "flex", flexDirection: "row", justifyContent: "space-between",marginTop: "1%"}}>
                                        <div style={{width: "49%"}}>
                                            <div className="criticHomeAddMovieLabel">
                                                Year Released:
                                            </div>
                                            <input type="number" step="1" className="criticHomeAddMovieInput" placeholder="Enter Year Released" value={this.state.movieYear} onChange={(e) => {this.setState({movieYear: e.target.value})}}></input>
                                        </div>
                                        <div style={{width: "49%"}}>
                                            <div className="criticHomeAddMovieLabel">
                                                Movie URL:
                                            </div>
                                            <input type="text" className="criticHomeAddMovieInput" placeholder="Enter Movie URL" value={this.state.movieURL} onChange={(e) => {this.setState({movieURL: e.target.value})}}></input>
                                        </div>
                                    </div>
                                    
                                    <div className="criticHomeAddMovieLabel">
                                        Select Genres:
                                    </div>
                                    <div className="addMovieGenreListBoundary">
                                        <div className="addMovieGenreListDiv">
                                            {this.state.genreList.map((e,id) => {return (
                                                <div className="criticHomeAddMovieGenreElement" 
                                                onClick={() => {this.handleGenreSelect(e)}} 
                                                style={this.state.selectedGenres[e.name]? {backgroundColor: e.color, color: "white"} : {backgroundColor: "white", color: "black"}}
                                                >
                                                    {e.name}
                                                </div>   
                                            )})}
                                        </div>
                                    </div>
                                    
                                    <div style={{width: "97%", display: "flex", flexDirection: "row", justifyContent: "space-between",marginTop: "1%"}}>
                                        <div style={{width: "28%"}}>
                                            <div className="criticHomeAddMovieLabel">
                                                Critic Rating:
                                            </div>
                                            <input type="number" step="0.01" placeholder="Enter Critic Rating" value={this.state.movieRating} onChange={(e) => {this.setState({movieRating: e.target.value})}} className="criticHomeAddMovieInput"></input>
                                        </div>
                                        <div style={{width: "33%"}}>
                                            <div className="criticHomeAddMovieLabel">
                                                Duration (mins):
                                            </div>
                                            <input type="number" step="1" placeholder="Enter Movie Duration" value={this.state.movieDuration} onChange={(e) => {this.setState({movieDuration: e.target.value})}} className="criticHomeAddMovieInput"></input>
                                        </div>
                                        <div style={{width: "33%"}}>
                                            <div className="criticHomeAddMovieLabel">
                                                Director:
                                            </div>
                                            <input type="text" placeholder="Enter Director Name" value={this.state.movieDirector} onChange={(e) => {this.setState({movieDirector: e.target.value})}} className="criticHomeAddMovieInput"></input>
                                        </div>
                                    </div>
                                    {this.state.movieActorList.length > 0 ? 
                                    <div style={{width: "100%", textAlign: "center", marginTop: "1%"}}>
                                        <b style={{fontSize: "20px", fontWeight: "500", marginBottom: "1%"}}>Actor List</b>
                                        {this.state.movieActorList.map((e,id) => {
                                            return(
                                                <div style={{width: "100%", textAlign: "center"}}>{e}</div>
                                            )
                                        })}
                                    </div> : null}
                                    <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "2%"}}>
                                        <div style={{width: "55%"}}>
                                            <input type="text" placeholder="Enter Actor Name" value={this.state.movieActor} onChange={(e) => {this.setState({movieActor: e.target.value})}} className="adminHomeDialogInput"></input>
                                        </div>
                                        <div style={{width: "30%", display: "flex", justifyContent: "center",alignItems: "center"}}>
                                            <button className="adminHomeAddActor" onClick={this.addActor}>Add Actor</button>
                                        </div>
                                    </div>
                                    <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "5%"}}>
                                        <button className="adminHomeAddMovieSubmit" onClick={this.addMovie}>Add Movie</button>
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
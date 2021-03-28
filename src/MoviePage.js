import React from 'react';
import './css/moviePage.css'
import { Component } from 'react';
import axios from 'axios';
import star from './static/star.png'
import Rating from '@material-ui/lab/Rating';
import Dialog from '@material-ui/core/Dialog';
export default class MoviePage extends Component{
    constructor(props){
        super(props);
        this.state = {
            movie_id: props.location.state ? props.location.state.movie_id : null,
            movieDic: {},
            isCritic: "NA",
            userRating: 0,
            errorMessage: "",
            friendList: [],
            selectedFriends: {},
            dialogOpen: false,
            favActorsDialogOpen: false,
            searchText: "",
            genreList: [],
            selectedGenres: {},
            favouriteActors: {},
            dataLoaded : false,
            reviewText: ""
        }
        this.logoutUser = this.logoutUser.bind(this);
        this.getFriendList = this.getFriendList.bind(this);
        this.toggleDialog = this.toggleDialog.bind(this);
        this.toggleFavActorsDialog = this.toggleFavActorsDialog.bind(this);
        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handleCheckBox = this.handleCheckBox.bind(this);
        this.recommendFriends = this.recommendFriends.bind(this);
        this.getAllGenres = this.getAllGenres.bind(this);
        this.handleGenreSelect = this.handleGenreSelect.bind(this);
        this.markFavouriteDirector = this.markFavouriteDirector.bind(this);
        this.markFavouriteActors = this.markFavouriteActors.bind(this);
        this.handleFavActorsCheckBox = this.handleFavActorsCheckBox.bind(this);
        this.rateMovie = this.rateMovie.bind(this);
        this.getMovieDetails = this.getMovieDetails.bind(this);
        this.getMovieRating = this.getMovieRating.bind(this);
        this.modifyGenres = this.modifyGenres.bind(this);
        this.addReview = this.addReview.bind(this);
    }
    componentDidMount(){
        fetch('/checkUserLoggedIn').then(res => res.json()).then(data => {
            if (!data.isUserLoggedIn)
                window.location.href = "/login";
            else if (data.isAdmin)
                window.location.href = "/adminHome"
            else{
                this.setState({isCritic: data.isCritic});
                if (data.isCritic)
                    this.getAllGenres();
            }
        });
        this.getMovieDetails();
    }
    modifyGenres(){
        var tempList = [];
        for (let key in this.state.selectedGenres){
            if (this.state.selectedGenres[key])
                tempList.push(key)
        }
        if (tempList.length==0){
            alert("Please specify atleast 1 Genre");
            return;
        }
        axios.post('/modifyGenres',{genreList: tempList,movie_id: this.state.movie_id})
        .then(res => {
        let data = res.data;
        if (data.success){
            this.getMovieDetails();
            alert("Genres modified successfully");
            var tempDic = this.state.selectedGenres;
            for (let key in tempDic){
                tempDic[key] = false;
            }
            this.setState({selectedGenres: tempDic});
        }
        else{
            alert(data.error);
        }
        }, (error) => {
            console.log(error);
        })
    }
    getMovieRating(){
        axios.post('/getMovieRating',{movie_id: this.state.movie_id})
        .then(res => {
        let data = res.data;
        if (data.success){
            this.setState({userRating: data.rating, reviewText: data.review})
        }
        else{
            alert(data.error);
        }
        }, (error) => {
            console.log(error);
        })
    }
    getMovieDetails(){
        axios.post('/getMovieDetails',{movie_id: this.state.movie_id})
        .then(res => {
        let data = res.data;
        if (data.success){
            var tempDic = {};
            for (let x of data.movieDic.actors)
                tempDic[x] = false;
            this.setState({movieDic: data.movieDic,favouriteActors: tempDic,dataLoaded: true}); 
            this.getMovieRating();
        }
        else{
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
    getAllGenres(){
        fetch('/getAllGenres').then(res => res.json()).then(data => {
            this.setState({genreList: data.genreList});
            var tempDic = {};
            for (let x of data.genreList){
                tempDic[x.name] = false;
            }
            this.setState({selectedGenres: tempDic});
        });
    }
    getFriendList(){
        fetch('/getFriendList').then(res => res.json()).then(data => {
            this.setState({friendList: data.friendList});
            let tempDic = {};
            for (let idx in data.friendList){
                let item = data.friendList[idx];
                tempDic[item.username] = false;
            }
            this.setState({selectedFriends: tempDic});
        });
    }
    markFavouriteDirector(){
        axios.post('/markFavouriteDirector',{directorName: this.state.movieDic.director})
        .then(res => {
        let data = res.data;
        if (data.success){
            alert("Director "+this.state.movieDic.director+" marked as favourite");
        }
        else{
            alert(data.error);
        }
        }, (error) => {
            console.log(error);
        })
    }
    markFavouriteActors(){
        var favActorsList = [];
        for (let key in this.state.favouriteActors){
            if (this.state.favouriteActors[key])
                favActorsList.push(key);
        }
        axios.post('/markFavouriteActors',{actorList: favActorsList})
        .then(res => {
        let data = res.data;
        if (data.success){
            alert("Marked favourite actors successfully");
        }
        else{
            alert(data.error);
        }
        }, (error) => {
            console.log(error);
        })
    }
    toggleDialog(){
        this.setState({dialogOpen: !this.state.dialogOpen});
    }
    toggleFavActorsDialog(){
        this.setState({favActorsDialogOpen: !this.state.favActorsDialogOpen});
    }
    handleSearchChange(e){
        this.setState({searchText: e.target.value});
    }
    handleCheckBox(ce) {
        let tempDic = this.state.selectedFriends;
        tempDic[ce.target.name] = !tempDic[ce.target.name];
        this.setState({selectedFriends: tempDic});
    }
    handleFavActorsCheckBox(ce) {
        let tempDic = this.state.favouriteActors;
        tempDic[ce.target.name] = !tempDic[ce.target.name];
        this.setState({favouriteActors: tempDic});
    }
    handleGenreSelect(e){
        var tempDic = this.state.selectedGenres;
        tempDic[e.name] = !tempDic[e.name];
        this.setState({selectedGenres: tempDic});
    }
    recommendFriends(){
        var friendList = []
        for (let key in this.state.selectedFriends){
            if(this.state.selectedFriends[key]){
                friendList.push(key)
            }
        }
        axios.post('/recommendFriends',{friendList: friendList,movie_id: this.state.movie_id})
        .then(res => {
        let data = res.data;
        if (data.success){
            alert("Recommendations sent successfully")
            this.toggleDialog()
        } else {
            alert(data.error)
        }
        }, (error) => {
            console.log(error);
        })
    }
    rateMovie(event, newValue){
        var oldValue = this.state.userRating;
        this.setState({userRating: newValue});
        axios.post('/rateMovie',{rating: newValue,movie_id: this.state.movie_id})
        .then(res => {
        let data = res.data;
        if (data.success){
            alert("Rating Saved Successfully");
            this.getMovieDetails();
        } else {
            alert(data.error)
            this.setState({userRating: oldValue});
        }
        }, (error) => {
            console.log(error);
            this.setState({userRating: oldValue});
        })
    }
    addReview(){
        axios.post('/addReview',{movie_id: this.state.movie_id, reviewText: this.state.reviewText })
        .then(res => {
        let data = res.data;
        if (data.success){
            alert("Review Saved Successfully");
            this.getMovieDetails();
        } else {
            alert(data.error)
        }
        }, (error) => {
            console.log(error);
        })
    }
    render(){
        if (this.state.movie_id===null){
            window.location.href = "/home";
        } else if(!this.state.dataLoaded){
            return(<div></div>)
        }
        return(
            <div className="moviePage">
                <Dialog onClose={this.toggleDialog} open={this.state.dialogOpen}>
                    <div className="friendsDialogBoundary">
                        <div className="dialogHeader">Friends</div>
                        <div style={{width: "100%", display: "flex",justifyContent: "center"}}>
                            <input type="text" className="dialogSearch" placeholder="Search Friends" onChange={this.handleSearchChange}></input>
                        </div>
                        <div style={{width: "100%", paddingTop: "1%",paddingBottom: "1%", display: "flex",justifyContent: "center"}}>
                            <div className="dialogFriendList">
                                {this.state.friendList.map((e,lid)=>{
                                if (e.username.toLowerCase().includes(this.state.searchText.toLowerCase()))
                                    return (
                                    <div style={{width: "95%",display: "flex",flexDirection: "row", padding: "3px 0px"}}>
                                        <input name={e.username} style={{marginTop: "7px", width: "15px"}} checked={this.state.selectedFriends[e.username]} type="checkbox" onChange={this.handleCheckBox}></input>
                                        <div style={{marginLeft: "5px",fontSize: "18px"}}>{e.username}</div>
                                    </div>
                                )})}
                            </div>
                        </div>
                        <div style={{width: "100%",margin: "3% 0%",display: "flex",justifyContent: "center"}}>
                            <div className="moviePageLogoutButton" onClick={this.recommendFriends}>Recommend</div>
                        </div>
                    </div>
                </Dialog>
                <Dialog open={this.state.favActorsDialogOpen} onClose={this.toggleFavActorsDialog}>
                    <div className="friendsDialogBoundary">
                        <div className="dialogHeader">Mark Favourite Actors</div>
                        <div style={{width: "100%", paddingTop: "1%",paddingBottom: "1%", display: "flex",justifyContent: "center"}}>
                            <div className="dialogFriendList">
                                {this.state.movieDic.actors.map((e,lid)=>{
                                    return (
                                    <div style={{width: "95%",display: "flex",flexDirection: "row", padding: "3px 0px", justifyContent: "center"}}>
                                        <input name={e} style={{marginTop: "7px", width: "15px"}} checked={this.state.favouriteActors[e]} type="checkbox" onChange={this.handleFavActorsCheckBox}></input>
                                        <div style={{marginLeft: "5px",fontSize: "18px"}}>{e}</div>
                                    </div>
                                )})}
                            </div>
                        </div>
                        <div style={{width: "100%",margin: "3% 0%",display: "flex",justifyContent: "center"}}>
                            <div className="moviePageLogoutButton" onClick={this.markFavouriteActors}>Mark Favourite</div>
                        </div>
                    </div>
                </Dialog>
                <div className="moviePageHeader">
                    <div className="moviePageHomeButton" onClick={() => {window.location.href = "/home"}}>Home</div>
                    <div className="moviePageMainHeader">Recommender System</div>
                    <div className="moviePageLogoutButton" onClick={this.logoutUser}>Logout</div>
                </div>
                <div className="moviePageContent">
                    <div style={{width: "100%", display: "flex",flexDirection: "row"}}>
                        <div style={{width: "80%"}}>
                            <div className="moviePageTitle">{this.state.movieDic.title} ({this.state.movieDic.year})</div>
                            {this.state.movieDic.genreList? 
                            <div className="moviePageGenres">
                                {this.state.movieDic.genreList.map((e,id) => {return(
                                    <div className="moviePageGenreElement" style={{backgroundColor: e[1]}}>
                                        {e[0]}
                                    </div>
                                )})}
                            </div>:null}
                        </div>
                        <div className="moviePageRatingDiv">
                            <div style={{width: "100%",display: "flex",flexDirection: "row",alignItems: "center"}}>
                                <img src={star} style={{width: "20%",height: "auto"}}></img>
                                <div style={{margin: "5%",fontSize: "25px"}}>
                                    <div>{this.state.movieDic.rating}/5</div>
                                    <div style={{fontSize: "15px"}}>{this.state.movieDic.numUsers} Users</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{width: "100%",display: 'flex',flexDirection: 'row'}}>
                        <div style={{width: "80%"}}>
                            <div className="moviePageInfo"><b>Duration: </b>{this.state.movieDic.duration} mins</div>
                            <div className="moviePageInfo"><b>Director: </b>{this.state.movieDic.director}</div>
                            <div className="moviePageInfo"><b>Actors: </b>{this.state.movieDic.actors.join(", ")}</div>
                        </div>
                        <div style={{width: "20%",display: "flex",alignItems:"center",justifyContent: "left"}}>
                            {!this.state.isCritic ? 
                            <div className="moviePageLogoutButton" onClick={() => {this.getFriendList();this.toggleDialog()}}>Recommend To Friends</div>
                            : null}
                        </div>
                    </div>
                    <div style={{marginTop: "8px",display: "flex",flexDirection: "row"}}>
                        <div className="moviePageInfo">Rate this movie: </div>
                        <div style={{marginTop: "10px",marginLeft: "9px"}}>
                            <Rating
                            name="simple-controlled"
                            value={this.state.userRating}
                            onChange={this.rateMovie}
                            />
                        </div>
                    </div>
                    {!this.state.isCritic ? 
                    <div style={{width: "100%", display: "flex", flexDirection: "row", margin: "1% 0%"}}>
                        <div className="moviePageLogoutButton" onClick={this.markFavouriteDirector}>Mark Favourite Director</div>
                        <div className="moviePageLogoutButton" style={{marginLeft: "1%"}} onClick={this.toggleFavActorsDialog}>Mark Favourite Actors</div>
                    </div>
                    : null}
                    {this.state.isCritic!="NA" && !this.state.isCritic && this.state.movieDic.reviews && this.state.movieDic.reviews.length>0? 
                    <div>
                        <div className="moviePageCriticReviewHeader">Critic Reviews</div>
                        <div style={{width: "95%"}}>
                            {this.state.movieDic.reviews.map((e,id) => {return(
                                <div className="moviePageCriticReviewDiv">
                                    <div className="moviePageCriticReviewName">{e.reviewedBy}</div>
                                    <div className="moviePageCriticReviewText">{e.content}</div>
                                </div>
                            )})}
                        </div>
                    </div> : null}
                    {this.state.isCritic!="NA" && this.state.isCritic ? 
                    <div>
                        <div className="moviePageCriticReviewHeader">Select Genres</div>
                        <div className="moviePageSelectGenreDiv">
                            {this.state.genreList.map((e,id) => {return (
                                <div className="addMovieGenreElement" 
                                onClick={() => {this.handleGenreSelect(e)}} 
                                style={this.state.selectedGenres[e.name]? {backgroundColor: e.color, color: "white"} : {backgroundColor: "white", color: "black"}}
                                >
                                    {e.name}
                                </div>   
                            )})}
                        </div>
                        <div style={{width: "10%",marginTop: "0.6%"}}>
                            <div className="moviePageLogoutButton" onClick={this.modifyGenres}>Modify Genres</div>
                        </div>  
                        <div className="moviePageCriticReviewHeader">Add Review</div>
                        <div style={{width: "95%"}}>
                            <textarea className="addReviewArea" value={this.state.reviewText} onChange={(e) => {this.setState({reviewText: e.target.value})}}></textarea>
                        </div>
                        <div style={{width: "10%",marginTop: "0.6%"}}>
                            <div className="moviePageLogoutButton" onClick={this.addReview}>Submit Review</div>
                        </div>                       
                    </div> : null}
                </div>
            </div>
        )
    }
}
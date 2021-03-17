import React from 'react';
import './css/home.css'
import { Component } from 'react';
import axios from 'axios';
import MovieCard from './MovieCard'
import FriendMovieCard from './FriendMovieCard';
import search from './static/search.png'
import Collapsible from 'react-collapsible';
import { Dialog, FormControl, RadioGroup, FormControlLabel, Radio } from '@material-ui/core';
import CancelRoundedIcon from '@material-ui/icons/CancelRounded';
import CheckCircleRoundedIcon from '@material-ui/icons/CheckCircleRounded';

export default class Home extends Component{
    constructor(){
        super();
        this.state = {
            username: "",
            movieList: [],
            friendRecs: [],
            profileDialogOpen: false,
            addFriendsDialogOpen: false,
            genreList: [],
            likedGenres: {},
            selectGenreDialogError: "",
            searchOption: "Title",
            requestQueue: [],
            userList: [],
            addFriendsSearchText: "",
            filteredUsersList: []
        }
        this.logoutUser = this.logoutUser.bind(this);
        this.toggleProfileDialog = this.toggleProfileDialog.bind(this);
        this.toggleAddFriendsDialog = this.toggleAddFriendsDialog.bind(this);
        this.getAllGenres = this.getAllGenres.bind(this);
        this.handleGenreSelect = this.handleGenreSelect.bind(this);
        this.saveGenres = this.saveGenres.bind(this);
        this.handleSearchOptionChange = this.handleSearchOptionChange.bind(this);
        this.handleAddFriendsSearchChange = this.handleAddFriendsSearchChange.bind(this);
        this.sendRequestToUser = this.sendRequestToUser.bind(this);
    }
    componentDidMount(){
        fetch('/getUsername').then(res => res.json()).then(data => {
            if (!data.isUserLoggedIn)
                window.location.href = "/login";
            else
                this.setState({username: data.username});
        });
        fetch('/getMovieList').then(res => res.json()).then(data => {
            this.setState({movieList: data.movieList});
        });
        fetch('/getFriendRecommendations').then(res => res.json()).then(data => {
            this.setState({friendRecs: data.friendRecs});
        });
        fetch('/getFriendRequests').then(res => res.json()).then(data => {
            this.setState({requestQueue: data.requestQueue})
            // console.log(data.requestQueue);
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
    toggleProfileDialog(){
        this.setState({profileDialogOpen: !this.state.profileDialogOpen, selectGenreDialogError: ""});
    }
    toggleAddFriendsDialog(){
        this.setState({addFriendsDialogOpen: !this.state.addFriendsDialogOpen});
    }
    getAllGenres(){
        fetch('/getAllGenres').then(res => res.json()).then(data => {
            this.setState({genreList: data.genreList});
            var tempDic = {};
            for (let x of data.genreList){
                tempDic[x.genre_id] = false;
            }
            // console.log(tempDic);
            this.setState({likedGenres: tempDic});
        });
    }
    getAllUsers(){
        fetch('/getAllUsers').then(res => res.json()).then(data => {
            this.setState({userList: data.userList, filteredUsersList: data.userList});
        });
    }
    handleGenreSelect(e){
        var tempDic = this.state.likedGenres;
        tempDic[e.genre_id] = !tempDic[e.genre_id];
        this.setState({likedGenres: tempDic, selectGenreDialogError: ""});
    }
    saveGenres(){
        let selected = false;
        for (let key in this.state.likedGenres){
            if (this.state.likedGenres[key]){
                selected = true;
                break;
            }
        }
        if (selected){
            this.setState({selectGenreDialogError: ""});
            this.toggleProfileDialog();
        }
        else
            this.setState({selectGenreDialogError: "Please select atleast 1 Genre"});
    }
    handleSearchOptionChange(e){
        this.setState({searchOption: e.target.value});
    }
    handleAddFriendsSearchChange(e){
        const lowerSearchText = e.target.value.toLowerCase();
        const filteredData = this.state.userList.filter(item => {
            return item.username.toLowerCase().includes(lowerSearchText);
        });
        this.setState({addFriendsSearchText: e.target.value, filteredUsersList: filteredData});
    }
    sendRequestToUser(username){
        axios.post('/sendRequestToUser',{username: username})
        .then(res => {
        let data = res.data;
        if (data.requestSent){
            alert("Request sent successfully to " + username);
        }
        else
            alert(data.error);
        }, (error) => {
            console.log(error);
        })
    }
    render() {
        var movieElement = this.state.movieList.map((e,id) => {return (<MovieCard movieDic={e}/>)});
        var friendElement = this.state.friendRecs.map((e,id) => {return (
            <div className="collapseDiv">
            <Collapsible trigger={e.name} triggerStyle={{cursor: 'pointer',fontSize: "17px"}} transitionTime={300}>
                <div style={{width: "95%",paddingTop: "1%",paddingBottom: "1%",paddingLeft: "3%"}}>
                    {e.movies.map((ei,idx) => {return (<FriendMovieCard movieDic={ei}/>)})}
                </div>
            </Collapsible>
            </div>
        )});
        var searchText = "Search Movies by " + this.state.searchOption;
        return (
            <div className="home">
                <Dialog open={this.state.profileDialogOpen} onClose={this.toggleProfileDialog}>
                    <div className="profileDialogBoundary">
                        <div className="profileDialogHeader">Select Liked Genres</div>
                        <div className="genreListBoundary">
                            <div className="genreListDiv">
                                {this.state.genreList.map((e,id) => {return (
                                    <div className="genreElement" 
                                    onClick={() => {this.handleGenreSelect(e)}} 
                                    style={this.state.likedGenres[e.genre_id]? {backgroundColor: e.color, color: "white"} : {backgroundColor: "white", color: "black"}}
                                    >
                                        {e.genre}
                                    </div>   
                                )})}
                            </div>
                        </div>
                        {this.state.selectGenreDialogError ? <div className="friendsDialogError">
                            {this.state.selectGenreDialogError}
                        </div> : null}
                        <div style={{width: "100%",display: "flex",justifyContent: "center", margin: "2% 0%", marginBottom: "5%"}}>
                            <div className="editYourProfile" onClick={this.saveGenres}>Save Genres</div>
                        </div>
                    </div>
                </Dialog>
                <Dialog open={this.state.addFriendsDialogOpen} onClose={this.toggleAddFriendsDialog}>
                    <div className="addFriendsDialogBoundary">
                        <div className="addFriendsDialogHeader">Add Friends</div>
                        <div style={{width: "100%", display: "flex",justifyContent: "center"}}>
                            <input type="text" className="addFriendsDialogSearch" placeholder="Search All Users" onChange={this.handleAddFriendsSearchChange}></input>
                        </div>
                        <div style={{width: "100%", paddingTop: "1%",paddingBottom: "1%", margin: "2% 0%", display: "flex",justifyContent: "center"}}>
                            <div className="addFriendsUserList">
                                {this.state.filteredUsersList.map((e,lid)=>{return (
                                    <div style={{width: "95%",display: "flex",flexDirection: "row", padding: "3px 5px", border: "1px solid #AAA", borderRadius: "4px", margin: "4px 0px"}}>
                                        <div style={{width: "75%"}}>
                                            <div style={{fontSize: "18px"}}>{e.username}</div>
                                            <div style={{fontSize: "13px"}}><b style={{fontWeight: "600"}}>Likes: </b>{e.likedGenres}</div>            
                                        </div>
                                        <div style={{width: "25%", display: "flex", alignItems: "center"}}>
                                            <div className="sendRequest" onClick={() => {this.sendRequestToUser(e.username)}}>Send Request</div>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    </div>
                </Dialog>
                <div className="homeHeading">
                    Recommender System
                </div>
                <div className="welcomeText">
                    Welcome {this.state.username}!
                </div>
                <div className="homeLogoutDiv" onClick={this.logoutUser}>
                    Logout
                </div>
                <div className="bottomContainer">
                    <div className="friendsPanel">
                        <div className="friendsHeader">Friend Recommendations</div>
                        {friendElement}
                    </div>
                    <div className="recommendationPanel">
                        <div className="searchMovieDiv">
                            <input className="searchMovie" placeholder={searchText} type="text"></input>
                            <div className="searchMovieIcon">
                                <img style={{width:"100%"}} src={search}></img>
                            </div>
                        </div>
                        <div className="recommendationHeader">
                            <div style={{backgroundColor: "white", padding: "10px", width: "100%", borderRadius: "6px", textAlign: "center"}}>Top Recommendations&nbsp;&nbsp;</div>
                        </div>
                        <div className="movieListPanel">
                            {movieElement}
                        </div>
                    </div>
                    <div className="optionsPanel">
                        <div style={{width: "96%"}}>
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
                            <div className="editYourProfileDiv">
                                <div className="editYourProfile" onClick={() => {this.getAllGenres();this.toggleProfileDialog();}}>Edit Liked Genres</div>
                            </div>
                            <div style={{width: "100%", display: "flex", justifyContent: "center", margin: "2% 0%"}}>
                                <div className="requestQueueOuterDiv">
                                    <div className="requestQueueHeader">Friend Requests</div>
                                    <div className="requestQueueDiv">
                                        {this.state.requestQueue.map((e,id) => {return (
                                            <div style={{width: "100%", display: "flex", justifyContent: "center"}}>
                                                <div className="requestElement">
                                                    <div style={{width:"80%", padding: "0% 2%"}}>
                                                        <div style={{fontSize: '17px'}}>{e.username}</div>
                                                        <div style={{fontSize: '12px'}}><b style={{fontWeight: "600"}}>Likes:</b> {e.likedGenres}</div>
                                                    </div>
                                                    <div style={{width:"10%",textAlign: "center"}}><CheckCircleRoundedIcon style={{color: "#33CC00", cursor: "pointer"}}/></div>
                                                    <div style={{width:"10%",textAlign: "center"}}><CancelRoundedIcon style={{color: "red", cursor: "pointer"}}/></div>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            </div>
                            <div className="editYourProfileDiv">
                                <div className="editYourProfile" onClick={() => {this.getAllUsers();this.toggleAddFriendsDialog();}}>Add Friends</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}
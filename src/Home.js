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
            isUserLoggedIn: false,
            movieList: [],
            friendRecs: [],
            profileDialogOpen: false,
            addFriendsDialogOpen: false,
            removeFriendsDialogOpen: false,
            watchHistoryDialogopen: false,
            genreList: [],
            likedGenres: {},
            selectGenreDialogError: "",
            searchOption: "Title",
            requestQueue: [],
            userList: [],
            addFriendsSearchText: "",
            removeFriendsSearchText: "",
            watchHistorySearchText: "",
            allFriendsList: [],
            watchHistory: [],
            moviePanelSearchText: ""
        }
        this.toggleProfileDialog = this.toggleProfileDialog.bind(this);
        this.toggleAddFriendsDialog = this.toggleAddFriendsDialog.bind(this);
        this.toggleWatchHistoryDialog = this.toggleWatchHistoryDialog.bind(this);
        this.toggleRemoveFriendsDialog = this.toggleRemoveFriendsDialog.bind(this);

        this.handleSearchOptionChange = this.handleSearchOptionChange.bind(this);
        this.handleAddFriendsSearchChange = this.handleAddFriendsSearchChange.bind(this);
        this.handleRemoveFriendsSearchChange = this.handleRemoveFriendsSearchChange.bind(this);
        this.handleWatchHistorySearchChange = this.handleWatchHistorySearchChange.bind(this);

        this.handleGenreSelect = this.handleGenreSelect.bind(this);
        this.getAllGenres = this.getAllGenres.bind(this);
        this.getAllFriends = this.getAllFriends.bind(this);
        this.getWatchHistory = this.getWatchHistory.bind(this);
        this.getAllFriendRequests = this.getAllFriendRequests.bind(this);
        this.getMovieList = this.getMovieList.bind(this);

        this.logoutUser = this.logoutUser.bind(this);
        this.removeFriend = this.removeFriend.bind(this);
        this.saveGenres = this.saveGenres.bind(this);
        this.sendRequestToUser = this.sendRequestToUser.bind(this);
        this.acceptFriendRequest = this.acceptFriendRequest.bind(this);
        this.deleteFriendRequest = this.deleteFriendRequest.bind(this);
    }
    componentDidMount(){
        fetch('/getUserDetails').then(res => res.json()).then(data => {
            if (!data.isUserLoggedIn)
                window.location.href = "/login";
            else if (data.isAdmin)
                window.location.href = "/adminHome";
            else if (data.isCritic)
                window.location.href = "/criticHome";
            else
                this.setState({username: data.username, isUserLoggedIn: true});
        });
        this.getMovieList();
        fetch('/getFriendRecommendations').then(res => res.json()).then(data => {
            this.setState({friendRecs: data.friendRecs});
        });
        this.getAllFriendRequests();
    }
    getAllFriendRequests(){
        fetch('/getFriendRequests').then(res => res.json()).then(data => {
            this.setState({requestQueue: data.requestQueue})
            // console.log(data.requestQueue);
        })
    }
    getMovieList(){
        axios.post('/getMovieList',{searchText: this.state.moviePanelSearchText, searchOption: this.state.searchOption})
        .then(res => {
            let data = res.data;
            if (data.success){
                this.setState({movieList: data.movieList});
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
    toggleProfileDialog(){
        this.setState({profileDialogOpen: !this.state.profileDialogOpen, selectGenreDialogError: ""});
    }
    toggleAddFriendsDialog(){
        this.setState({addFriendsDialogOpen: !this.state.addFriendsDialogOpen});
    }
    toggleRemoveFriendsDialog(){
        this.setState({removeFriendsDialogOpen: !this.state.removeFriendsDialogOpen});
    }
    toggleWatchHistoryDialog(){
        this.setState({watchHistoryDialogopen: !this.state.watchHistoryDialogopen});
    }
    getAllGenres(){
        fetch('/getAllGenres').then(res => res.json()).then(data => {
            this.setState({genreList: data.genreList});
            var tempDic = {}
            for (let x of data.genreList){
                tempDic[x.name] = false;
            }
            fetch('/getLikedGenres').then(res => res.json()).then(data => {
                for (let x of data.likedGenres){
                    tempDic[x] = true;
                }
                this.setState({likedGenres: tempDic });
            })
            // console.log(tempDic);
            // this.setState({likedGenres: tempDic});
        });
    }
    getAllUsers(){
        fetch('/getAllUsers').then(res => res.json()).then(data => {
            this.setState({userList: data.userList});
        });
    }
    getAllFriends(){
        fetch('/getFriendList').then(res => res.json()).then(data => {
            this.setState({allFriendsList: data.friendList});
        });
    }
    getWatchHistory(){
        fetch('/getWatchHistory').then(res => res.json()).then(data => {
            this.setState({watchHistory: data.watchHistory});
        });
    }
    handleGenreSelect(e){
        var tempDic = this.state.likedGenres;
        tempDic[e.name] = !tempDic[e.name];
        this.setState({likedGenres: tempDic, selectGenreDialogError: ""});
    }
    saveGenres(){
        let selected = false;
        var liked = []
        for (let key in this.state.likedGenres){
            if (this.state.likedGenres[key]){
                liked.push(key)
            }
        }
        if (liked.length!=0){
            this.setState({selectGenreDialogError: ""});
            axios.post('/saveGenres',{likedGenres: liked})
                    .then(res => {
                    let data = res.data;
                    if (data.success){
                        alert("Genres saved successfully")
                        this.toggleProfileDialog();
                    } else {
                        this.setState({selectGenreDialogError: data.error});
                    }
                    }, (error) => {
                        console.log(error);
                    })
        }
        else
            this.setState({selectGenreDialogError: "Please select atleast 1 Genre"});
    }
    handleSearchOptionChange(e){
        this.setState({searchOption: e.target.value});
    }
    handleAddFriendsSearchChange(e){
        this.setState({addFriendsSearchText: e.target.value});
    }
    handleRemoveFriendsSearchChange(e){
        this.setState({removeFriendsSearchText: e.target.value});
    }
    handleWatchHistorySearchChange(e){
        this.setState({watchHistorySearchText: e.target.value});
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
    removeFriend(username){
        var confirmation = window.confirm("Remove "+username+" from Friends?");
        if (confirmation){
            axios.post('/removeFriend',{username: username})
            .then(res => {
            let data = res.data;
            if (data.success){
                alert("Removed " + username + " from Friends successfully");
                this.getAllFriends()
            }
            else
                alert(data.error);
            }, (error) => {
                console.log(error);
            });
        }
    } 
    acceptFriendRequest(username){
        var confirmation = window.confirm("Accept request from "+username+"?");
        if (confirmation){
            axios.post('/addFriend',{username: username})
            .then(res => {
            let data = res.data;
            if (data.success){
                alert("Accpeted request from " + username + " successfully");
                this.getAllFriendRequests();
            }
            else
                alert(data.error);
            }, (error) => {
                console.log(error);
            });
        }
    }
    deleteFriendRequest(username){
        var confirmation = window.confirm("Delete request from "+username+"?");
        if (confirmation){
            axios.post('/deleteFriendRequest',{username: username})
            .then(res => {
            let data = res.data;
            if (data.success){
                alert("Deleted request from " + username + " successfully");
                this.getAllFriendRequests();
            }
            else
                alert(data.error);
            }, (error) => {
                console.log(error);
            });
        }
    }
    render() {
        if (!this.state.isUserLoggedIn)
            return (<div></div>)
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
                                    style={this.state.likedGenres[e.name]? {backgroundColor: e.color, color: "white"} : {backgroundColor: "white", color: "black"}}
                                    >
                                        {e.name}
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
                                {this.state.userList.map((e,lid)=>{
                                if (e.username.toLowerCase().includes(this.state.addFriendsSearchText.toLowerCase()))
                                    return (
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
                <Dialog open={this.state.removeFriendsDialogOpen} onClose={this.toggleRemoveFriendsDialog}>
                    <div className="addFriendsDialogBoundary">
                        <div className="addFriendsDialogHeader">Remove Friends</div>
                        <div style={{width: "100%", display: "flex",justifyContent: "center"}}>
                            <input type="text" className="addFriendsDialogSearch" placeholder="Search All Friends" onChange={this.handleAddFriendsSearchChange}></input>
                        </div>
                        <div style={{width: "100%", paddingTop: "1%",paddingBottom: "1%", margin: "2% 0%", display: "flex",justifyContent: "center"}}>
                            <div className="addFriendsUserList">
                                {this.state.allFriendsList.map((e,lid)=>{
                                if (e.username.toLowerCase().includes(this.state.addFriendsSearchText.toLowerCase()))
                                    return (
                                    <div style={{width: "95%",display: "flex",flexDirection: "row", padding: "3px 5px", border: "1px solid #AAA", borderRadius: "4px", margin: "4px 0px"}}>
                                        <div style={{width: "95%"}}>
                                            <div style={{fontSize: "18px"}}>{e.username}</div>            
                                        </div>
                                        <div style={{width: "5%", display: "flex", alignItems: "center"}}>
                                            <CancelRoundedIcon style={{color: "red", cursor: "pointer"}} onClick={() => {this.removeFriend(e.username)}}/>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    </div>
                </Dialog>
                <Dialog open={this.state.watchHistoryDialogopen} onClose={this.toggleWatchHistoryDialog}>
                    <div className="addFriendsDialogBoundary">
                        <div className="addFriendsDialogHeader">Watched Movies</div>
                        <div style={{width: "100%", display: "flex",justifyContent: "center"}}>
                            <input type="text" className="addFriendsDialogSearch" placeholder="Search Movies by Title" onChange={this.handleWatchHistorySearchChange}></input>
                        </div>
                        <div style={{width: "100%", paddingTop: "1%",paddingBottom: "1%", margin: "2% 0%", display: "flex",justifyContent: "center"}}>
                            <div className="addFriendsUserList">
                                {this.state.watchHistory.map((e,lid)=>{
                                if (e.title.toLowerCase().includes(this.state.watchHistorySearchText.toLowerCase()))
                                    return (
                                    <FriendMovieCard movieDic={e}/>
                                )})}
                            </div>
                        </div>
                    </div>
                </Dialog>
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
                    <div className="friendsPanel">
                        <div className="friendsHeader">Friend Recommendations</div>
                        {friendElement}
                    </div>
                    <div className="recommendationPanel">
                        <div className="searchMovieDiv">
                            <input className="searchMovie" placeholder={searchText} type="text" value={this.state.moviePanelSearchText} onChange={(e) => {this.setState({moviePanelSearchText: e.target.value})}}></input>
                            <div className="searchMovieIcon">
                                <img style={{width:"100%"}} src={search} onClick={this.getMovieList}></img>
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
                                <div className="editYourProfile" style={{width: "31%", fontSize: "1.1vw"}} onClick={() => {this.getAllGenres();this.toggleProfileDialog();}}>Edit Liked Genres</div>
                                <div className="editYourProfile" style={{width: "31%",fontSize: "1.1vw",marginLeft: "3%"}} onClick={() => {this.getWatchHistory();this.toggleWatchHistoryDialog();}}>Watch History</div>
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
                                                    <div style={{width:"10%",textAlign: "center"}}><CheckCircleRoundedIcon onClick={() =>{this.acceptFriendRequest(e.username)}} style={{color: "#33CC00", cursor: "pointer"}}/></div>
                                                    <div style={{width:"10%",textAlign: "center"}}><CancelRoundedIcon onClick={() =>{this.deleteFriendRequest(e.username)}} style={{color: "red", cursor: "pointer"}}/></div>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            </div>
                            <div className="editYourProfileDiv">
                                <div className="editYourProfile" style={{width: "31%", fontSize: "1.1vw"}} onClick={() => {this.getAllUsers();this.toggleAddFriendsDialog();}}>Add Friends</div>
                                <div className="editYourProfile" style={{width: "31%", fontSize: "1.1vw",marginLeft: "3%"}} onClick={() => {this.getAllFriends();this.toggleRemoveFriendsDialog();}}>Remove Friends</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}
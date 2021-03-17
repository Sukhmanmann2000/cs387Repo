import React from 'react';
import './moviePage.css'
import { Component } from 'react';
import axios from 'axios';
import star from './star.png'
import Rating from '@material-ui/lab/Rating';
import Dialog from '@material-ui/core/Dialog';
export default class MoviePage extends Component{
    constructor(props){
        super(props);
        this.state = {
            movieDic: props.location.state ? props.location.state.movieDic : null,
            userRating: 0,
            errorMessage: "",
            friendList: [],
            filteredList: [],
            selectedFriends: {},
            dialogOpen: false,
            searchText: ""
        }
        this.logoutUser = this.logoutUser.bind(this);
        this.getFriendList = this.getFriendList.bind(this);
        this.toggleDialog = this.toggleDialog.bind(this);
        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handleCheckBox = this.handleCheckBox.bind(this);
        this.recommendFriends = this.recommendFriends.bind(this);
    }
    componentDidMount(){
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
    getFriendList(){
        fetch('/getFriendList').then(res => res.json()).then(data => {
            this.setState({friendList: data.friendList, filteredList: data.friendList});
            let tempDic = {};
            for (let idx in data.friendList){
                let item = data.friendList[idx];
                tempDic[item.id] = false;
            }
            this.setState({selectedFriends: tempDic});
        });
    }
    toggleDialog(){
        this.setState({dialogOpen: !this.state.dialogOpen});
    }
    handleSearchChange(e){
        const lowerSearchText = e.target.value.toLowerCase();
        const filteredData = this.state.friendList.filter(item => {
            return item.name.toLowerCase().includes(lowerSearchText);
        });
        this.setState({searchText: e.target.value, filteredList: filteredData});
    }
    handleCheckBox(ce) {
        let tempDic = this.state.selectedFriends;
        tempDic[ce.target.name] = !tempDic[ce.target.name];
        this.setState({selectedFriends: tempDic});
    }
    recommendFriends(){
        this.toggleDialog();
    }
    render(){
        if (!this.state.movieDic){
            window.location.href = "/home";
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
                                {this.state.filteredList.map((e,lid)=>{return (
                                    <div style={{width: "95%",display: "flex",flexDirection: "row", padding: "3px 0px"}}>
                                        <input name={e.id} style={{marginTop: "7px", width: "15px"}} checked={this.state.selectedFriends[e.id]} type="checkbox" onChange={this.handleCheckBox}></input>
                                        <div style={{marginLeft: "5px",fontSize: "18px"}}>{e.name}</div>
                                    </div>
                                )})}
                            </div>
                        </div>
                        <div style={{width: "100%",margin: "3% 0%",display: "flex",justifyContent: "center"}}>
                            <div className="moviePageLogoutButton" onClick={this.recommendFriends}>Recommend</div>
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
                                    <div className="moviePageGenreElement" style={{backgroundColor: "orange"}}>
                                        {e}
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
                            <div className="moviePageInfo"><b>Director: </b>{this.state.movieDic.director}</div>
                            <div className="moviePageInfo"><b>Actors: </b>{this.state.movieDic.actors}</div>
                        </div>
                        <div style={{width: "20%",display: "flex",alignItems:"center",justifyContent: "left"}}>
                            <div className="moviePageLogoutButton" onClick={() => {this.getFriendList();this.toggleDialog()}}>Recommend To Friends</div>
                        </div>
                    </div>
                    <div style={{marginTop: "8px",display: "flex",flexDirection: "row"}}>
                        <div className="moviePageInfo">Rate this movie: </div>
                        <div style={{marginTop: "10px",marginLeft: "9px"}}>
                            <Rating
                            name="simple-controlled"
                            value={this.state.userRating}
                            onChange={(event, newValue) => {
                                this.setState({userRating: newValue});
                            }}
                            />
                        </div>
                    </div>
                    {this.state.movieDic.reviews && this.state.movieDic.reviews.length>0? 
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
                </div>
            </div>
        )
    }
}
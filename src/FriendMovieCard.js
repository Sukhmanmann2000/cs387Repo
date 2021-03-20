import React, { useState, useEffect } from 'react';
import './css/movieCard.css'
import { Component } from 'react';
import star from './static/star.png'
import { withRouter } from 'react-router-dom';
import CancelRoundedIcon from '@material-ui/icons/CancelRounded';
import CheckCircleRoundedIcon from '@material-ui/icons/CheckCircleRounded';
import axios from 'axios';
class FriendMovieCard extends Component{
    constructor(props){
        super(props)
        this.state = {
            
        }
        this.openMoviePage = this.openMoviePage.bind(this);
        this.sendLikedRecommendation = this.sendLikedRecommendation.bind(this);
        this.removeRecommendation = this.removeRecommendation.bind(this);
    }
    openMoviePage(){
        this.props.history.push({
            pathname: "/moviePage",
            state: {
                movie_id: this.props.movieDic.id
            }
        })
    }
    sendLikedRecommendation(){
        axios.post('/sendLikedRecommendation',{username: this.props.friendUsername,movie_id: this.props.movieDic.id})
        .then(res => {
            let data = res.data;
            if (data.success){
                this.props.getFunc();
            }
            else
                alert(data.error);
        }, (error) => {
            console.log(error);
        });
    }
    removeRecommendation(){
        axios.post('/removeRecommendation',{username: this.props.friendUsername,movie_id: this.props.movieDic.id})
        .then(res => {
            let data = res.data;
            if (data.success){
                this.props.getFunc();
            }
            else
                alert(data.error);
        }, (error) => {
            console.log(error);
        });
    }
    render() {
        var movieDic = this.props.movieDic;
        return(
            <div className="friendmovieCard" style={{cursor: "default"}}>
                <div style={{width: "100%",display: "flex",flexDirection: "row"}}>
                    <div className="friendmovieTitle" style={{cursor: 'pointer'}} onClick={this.openMoviePage}>
                        {movieDic.title} ({movieDic.year})
                    </div>
                    <div style={{width: "17%",display: "flex",alignItems: "center", marginTop: "1%"}}>
                        <img style={{width: "18px"}} src={star}></img>
                        <div style={{marginLeft: "7px",marginTop: "1px",fontSize: "13px"}}>{movieDic.rating}/5</div>
                    </div>
                </div>
                <div style={{width: "100%", display: "flex", flexDirection: "row"}}>
                    <div style={{width: "80%"}}>
                        <div className="friendmovieInfo"><b style={{fontWeight: "800"}}>Genres: </b>{movieDic.genre}</div>
                        <div className="friendmovieInfo"><b style={{fontWeight: "800"}}>Director: </b>{movieDic.director}</div>
                        <div className="friendmovieInfo"><b style={{fontWeight: "800"}}>Actors: </b>{movieDic.actors.join(", ")}</div>
                    </div>
                    <div style={{width: "20%"}}>
                        {this.props.displayLiked ? 
                        <div style={{width: "100%"}}>
                            <div style={{width: '100%', textAlign: "center", fontSize: "12px", fontWeight: "800", marginTop: "9%"}}>Liked:</div>
                            <div style={{width: "100%", display: "flex", justifyContent: "center", marginBottom: "-9%"}}>
                                <div style={{width: "30%"}}>
                                    <CheckCircleRoundedIcon onClick={this.sendLikedRecommendation} style={{width: "100%",color: "#33CC00", cursor: "pointer"}}/>
                                </div>
                                <div style={{width: "30%", marginLeft: "20%"}}>
                                    <CancelRoundedIcon onClick={this.removeRecommendation} style={{width: "100%",color: "red", cursor: "pointer"}}/>
                                </div>
                            </div>
                        </div>
                        : null }
                    </div>
                </div>
                
            </div>
        )
    }
}
export default withRouter(FriendMovieCard);
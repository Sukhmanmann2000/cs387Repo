import React, { useState, useEffect } from 'react';
import './css/movieCard.css'
import { Component } from 'react';
import star from './static/star.png'
import { withRouter } from 'react-router-dom';
class FriendMovieCard extends Component{
    constructor(props){
        super(props)
        this.state = {
            
        }
        this.openMoviePage = this.openMoviePage.bind(this);
    }
    openMoviePage(){
        this.props.history.push({
            pathname: "/moviePage",
            state: {
                movieDic: this.props.movieDic
            }
        })
    }
    render() {
        var movieDic = this.props.movieDic;
        return(
            <div className="friendmovieCard" onClick={this.openMoviePage}>
                <div style={{width: "100%",display: "flex",flexDirection: "row"}}>
                    <div className="friendmovieTitle">
                        {movieDic.title} ({movieDic.year})
                    </div>
                    <div style={{width: "17%",display: "flex",alignItems: "center", marginTop: "1%"}}>
                        <img style={{width: "18px"}} src={star}></img>
                        <div style={{marginLeft: "7px",marginTop: "1px",fontSize: "13px"}}>{movieDic.rating}/5</div>
                    </div>
                </div>
                <div className="friendmovieInfo"><b style={{fontWeight: "800"}}>Genres: </b>{movieDic.genre}</div>
                <div className="friendmovieInfo"><b style={{fontWeight: "800"}}>Director: </b>{movieDic.director}</div>
                <div className="friendmovieInfo"><b style={{fontWeight: "800"}}>Actors: </b>{movieDic.actors.join(", ")}</div>
                
            </div>
        )
    }
}
export default withRouter(FriendMovieCard);
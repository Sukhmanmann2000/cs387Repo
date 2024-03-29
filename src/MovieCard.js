import React, { useState, useEffect } from 'react';
import './css/movieCard.css'
import { Component } from 'react';
import star from './static/star.png'
import axios from 'axios';
import { withRouter } from 'react-router-dom';
class MovieCard extends Component{
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
                movie_id: this.props.movieDic.id
            }
        })
    }
    render() {
        var movieDic = this.props.movieDic;
        return(
            <div className="movieCard" onClick={this.openMoviePage}>
                <div style={{width: "100%",display: "flex",flexDirection: "row"}}>
                    <div className="movieTitle">
                        {movieDic.title} ({movieDic.year})
                    </div>
                    <div style={{width: "15%",display: "flex",alignItems: "center", marginTop: "1%"}}>
                        <img style={{width: "25px"}} src={star}></img>
                        <div style={{marginLeft: "10px",marginTop: "2px"}}>{movieDic.rating}/5</div>
                    </div>
                </div>
                <div className="movieInfo"><b style={{fontWeight: "900"}}>Genres: </b>{movieDic.genreList.join(", ")}</div>
                <div className="movieInfo"><b style={{fontWeight: "900"}}>Director: </b>{movieDic.director}</div>
                <div className="movieInfo"><b style={{fontWeight: "900"}}>Actors: </b>{movieDic.actors.join(", ")}</div>
                
            </div>
        )
    }
}
export default withRouter(MovieCard);
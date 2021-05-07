import React from 'react';
import './css/adminHome.css'
import { Component } from 'react';
import axios from 'axios';
import { Dialog } from '@material-ui/core';
import Select from 'react-select';
import CancelRoundedIcon from '@material-ui/icons/CancelRounded';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

const customSelectStyle = {
    control: styles => ({ ...styles, backgroundColor: 'white', fontSize: "17px",fontWeight: "400",width: "97%", marginTop: "-3px", marginLeft: "5px" }),
    option: (styles, { data, isDisabled, isFocused, isSelected }) => {
        return {
        ...styles,
        fontWeight: "500",
        color: "black",
        cursor: isDisabled ? 'not-allowed' : 'default',
        };
    },
}

export default class AdminHome extends Component{
    constructor(){
        super();
        this.state = {
            username: "",
            isUserLoggedIn: false,
            addCriticDialogOpen: false,
            removeCriticDialogOpen: false,
            addMovieDialogOpen: false,
            addCriticErrorMessage: "",
            addMovieErrorMessage: "",
            criticUsername: "",
            criticPassword: "",
            criticGender: "",
            criticName: "",
            criticDob: "",
            criticList: [],
            removeCriticSearchText: "",
            movieTitle: "",
            movieYear: "",
            movieURL: "",
            movieRating: "",
            movieDuration: "",
            movieDirector: "",
            movieActor: "",
            movieActorList: [],
            genreList: [],
            selectedGenres: {},
            analyticsDic: {}
        }
        this.logoutUser = this.logoutUser.bind(this);
        this.getUserDetails = this.getUserDetails.bind(this);
        this.toggleAddCriticDialog = this.toggleAddCriticDialog.bind(this);
        this.addCritic = this.addCritic.bind(this);
        this.getAllCritics = this.getAllCritics.bind(this);
        this.toggleRemoveCriticDialog = this.toggleRemoveCriticDialog.bind(this);
        this.handleRemoveCriticSearchChange = this.handleRemoveCriticSearchChange.bind(this);
        this.removeCritic = this.removeCritic.bind(this);
        this.toggleAddMovieDialog = this.toggleAddMovieDialog.bind(this);
        this.addActor = this.addActor.bind(this);
        this.addMovie = this.addMovie.bind(this);
        this.getAllGenres = this.getAllGenres.bind(this);
        this.handleGenreSelect = this.handleGenreSelect.bind(this);
        this.getAnalytics = this.getAnalytics.bind(this);
    }
    getUserDetails(){
        fetch('/getUserDetails').then(res => res.json()).then(data => {
            if (!data.isUserLoggedIn)
                window.location.href = "/login";
            else if (data.isCritic)
                window.location.href = "/criticHome";
            else if (!data.isAdmin)
                window.location.href = "/home";
            
            else
                this.setState({username: data.username, isUserLoggedIn: true});
        });
    }
    componentDidMount(){
        this.getUserDetails();
        this.getAnalytics();
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
    addCritic() {
        if (!this.state.criticUsername || !this.state.criticPassword || !this.state.criticName){
            this.setState({addCriticErrorMessage: "Please enter the required Details"});
            return;
        }
        else if (this.state.criticPassword.length < 5){
            this.setState({addCriticErrorMessage: "Password must be atleast 5 characters long"});
            return;
        }
        axios.post('/addCritic',{
            username: this.state.criticUsername, 
            password: this.state.criticPassword,
            name: this.state.criticName,
            gender: this.state.criticGender,
            dob: this.state.criticDob
        })
        .then(res => {
            let data = res.data;
            if (data.success){
                alert("Critic Added Successfully!");
                this.setState({criticUsername: "", criticPassword: "", criticName: "", criticGender: "", criticDob: "", addCriticErrorMessage: ""});
                this.getAnalytics();
            }
            else{
                this.setState({addCriticErrorMessage: data.error});
            }
        }, (error) => {
            console.log(error);
            this.getUserDetails();
        })
    }
    getAnalytics(){
        fetch('/getAdminAnalytics').then(res => res.json()).then(data => {
            if (!data.error){
                this.setState({analyticsDic: data.analyticsDic})
            }
            else
                console.log(data.error);
        });
    }
    getAllCritics(){
        fetch('/getAllCritics').then(res => res.json()).then(data => {
            if (!data.error){
                this.setState({criticList: data.criticList})
            }
            else
                console.log(data.error);
        });
    }
    getAllGenres(){
        fetch('/getAllGenres').then(res => res.json()).then(data => {
            this.setState({genreList: data.genreList});
            var tempDic = {};
            for (let x of data.genreList){
                tempDic[x.name] = false;
            }
            this.setState({selectedGenres: tempDic});
            console.log(tempDic);
        });
    }
    handleGenreSelect(e){
        var tempDic = this.state.selectedGenres;
        tempDic[e.name] = !tempDic[e.name];
        this.setState({selectedGenres: tempDic});
    }
    removeCritic(criticUsername){
        var confirmation = window.confirm("Remove "+criticUsername+" from Critics?")
        if (!confirmation)
            return;
        axios.post('/removeCritic',{
            username: criticUsername, 
        })
        .then(res => {
            let data = res.data;
            if (data.success){
                this.getAllCritics();
                this.getAnalytics();
                alert("Critic Removed Successfully!");
            }
            else{
                alert(data.error)
            }
        }, (error) => {
            console.log(error);
            this.getUserDetails();
        })
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
        if (this.state.movieYear < 1878){
            alert("Year Released should be greater than realease year of earliest movie (1878)")
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
                this.getAnalytics();
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
                });
            }
            else{
                alert(data.error)
            }
        }, (error) => {
            console.log(error);
            this.getUserDetails();
        })
    }
    addActor(){
        var actorList = this.state.movieActorList;
        if (this.state.movieActor.trim()==""){
            alert("Actor name should not be NULL!")
            return;
        }
        actorList.push(this.state.movieActor);
        this.setState({movieActorList: actorList, movieActor: ""});
    }
    handleRemoveCriticSearchChange(e){
        this.setState({removeCriticSearchText: e.target.value});
    }
    toggleAddCriticDialog(){
        this.setState({addCriticDialogOpen: !this.state.addCriticDialogOpen});
    }
    toggleRemoveCriticDialog(){
        this.setState({removeCriticDialogOpen: !this.state.removeCriticDialogOpen});
    }
    toggleAddMovieDialog(){
        this.setState({addMovieDialogOpen: !this.state.addMovieDialogOpen});
    }
    render(){
        if (!this.state.isUserLoggedIn)
            return(<div></div>);
        return(
            <div className="adminHome">
                <Dialog open={this.state.addCriticDialogOpen} onClose={this.toggleAddCriticDialog}>
                    <div className="addCriticDialogDiv">
                        <div style={{width: "95%", padding: "3% 0%"}}>
                            <div style={{width: "100%",textAlign: "center", fontSize: "25px", fontWeight: "bold", color: "orange"}}>
                                Add Critic
                            </div>
                            {this.state.addCriticErrorMessage ? <div className="addCriticError">
                                {this.state.addCriticErrorMessage}
                            </div> : null}
                            <div className="adminHomeDialogLabel">
                                Username:
                            </div>
                            <input id="criticUsername" type="text" className="adminHomeDialogInput" placeholder="Enter Username" value={this.state.criticUsername} onChange={(e) => {this.setState({criticUsername: e.target.value})}}></input>
                            <div className="adminHomeDialogLabel">
                                Password:
                            </div>
                            <input id="criticPassword" type="Password" className="adminHomeDialogInput" placeholder="Enter Password" value={this.state.criticPassword} onChange={(e) => {this.setState({criticPassword: e.target.value})}}></input>
                            <div className="adminHomeDialogLabel">
                                Name:
                            </div>
                            <input type="text" className="adminHomeDialogInput" placeholder="Enter your Full Name" value={this.state.criticName} onChange={(e) => {this.setState({criticName: e.target.value})}}></input>
                            <div className="adminHomeDialogLabel" style={{marginBottom: "2%"}}>
                                Gender:
                            </div>
                            <Select styles={customSelectStyle} 
                                options={[{value: 'Male', label: 'Male'},{value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}]}
                                label="Select Gender"
                                // value={this.state.criticGender}
                                placeholder = "Select Gender"
                                onChange = {(e) => {this.setState({criticGender: e.value})}}
                            />
                            <div className="adminHomeDialogLabel">
                                Date of Birth:
                            </div>
                            <input type="date" placeholder="Select Date of Birth" value={this.state.criticDob} onChange={(e) => {this.setState({criticDob: e.target.value})}} className="adminHomeDialogInput"></input>
                            <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "5%"}}>
                                <button className="loginSubmit" onClick={this.addCritic}>Add Critic</button>
                            </div>
                        </div>
                    </div>
                </Dialog>
                <Dialog open={this.state.removeCriticDialogOpen} onClose={this.toggleRemoveCriticDialog}>
                    <div className="removeCriticDialogBoundary">
                        <div className="removeCriticDialogHeader">Remove Critics</div>
                        <div style={{width: "100%", display: "flex",justifyContent: "center"}}>
                            <input type="text" className="removeCriticDialogSearch" placeholder="Search All Critics" onChange={this.handleRemoveCriticSearchChange}></input>
                        </div>
                        <div style={{width: "100%", paddingTop: "1%",paddingBottom: "1%", margin: "2% 0%", display: "flex",justifyContent: "center"}}>
                            <div className="removeCriticsList">
                                {this.state.criticList.map((e,lid)=>{
                                if (e.toLowerCase().includes(this.state.removeCriticSearchText.toLowerCase()))
                                    return (
                                        <div style={{width: "95%",display: "flex",flexDirection: "row", padding: "3px 5px", border: "1px solid #AAA", borderRadius: "4px", margin: "4px 0px"}}>
                                            <div style={{width: "95%"}}>
                                                <div style={{fontSize: "18px"}}>{e}</div>            
                                            </div>
                                            <div style={{width: "5%", display: "flex", alignItems: "center"}}>
                                                <CancelRoundedIcon style={{color: "red", cursor: "pointer"}} onClick={() => this.removeCritic(e)}/>
                                            </div>
                                        </div>
                                )})}
                            </div>
                        </div>
                    </div>
                </Dialog>
                <Dialog open={this.state.addMovieDialogOpen} onClose={this.toggleAddMovieDialog}>
                    <div className="addMovieDialogDiv">
                        <div style={{width: "95%", padding: "3% 0%"}}>
                            <div style={{width: "100%",textAlign: "center", fontSize: "25px", fontWeight: "bold", color: "orange"}}>
                                Add Movie
                            </div>
                            {this.state.addMovieErrorMessage ? <div className="addCriticError">
                                {this.state.addMovieErrorMessage}
                            </div> : null}
                            <div className="adminHomeDialogLabel">
                                Title:
                            </div>
                            <input type="text" className="adminHomeDialogInput" placeholder="Enter Title" value={this.state.movieTitle} onChange={(e) => {this.setState({movieTitle: e.target.value})}}></input>
                            <div style={{width: "97%", display: "flex", flexDirection: "row", justifyContent: "space-between",marginTop: "1%"}}>
                                <div style={{width: "49%"}}>
                                    <div className="adminHomeDialogLabel">
                                        Year Released:
                                    </div>
                                    <input type="number" step="1" className="adminHomeDialogInput" placeholder="Enter Year Released" value={this.state.movieYear} onChange={(e) => {this.setState({movieYear: e.target.value})}}></input>
                                </div>
                                <div style={{width: "49%"}}>
                                    <div className="adminHomeDialogLabel">
                                        Movie URL:
                                    </div>
                                    <input type="text" className="adminHomeDialogInput" placeholder="Enter Movie URL" value={this.state.movieURL} onChange={(e) => {this.setState({movieURL: e.target.value})}}></input>
                                </div>
                            </div>
                            
                            
                            <div className="adminHomeDialogLabel">
                                Select Genres:
                            </div>
                            <div className="addMovieGenreListBoundary">
                                <div className="addMovieGenreListDiv">
                                    {this.state.genreList.map((e,id) => {return (
                                        <div className="addMovieGenreElement" 
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
                                    <div className="adminHomeDialogLabel">
                                        Admin Rating:
                                    </div>
                                    <input type="number" step="0.01" placeholder="Enter Admin Rating" value={this.state.movieRating} onChange={(e) => {this.setState({movieRating: e.target.value})}} className="adminHomeDialogInput"></input>
                                </div>
                                <div style={{width: "33%"}}>
                                    <div className="adminHomeDialogLabel">
                                        Duration (mins):
                                    </div>
                                    <input type="number" step="1" placeholder="Enter Movie Duration" value={this.state.movieDuration} onChange={(e) => {this.setState({movieDuration: e.target.value})}} className="adminHomeDialogInput"></input>
                                </div>
                                <div style={{width: "33%"}}>
                                    <div className="adminHomeDialogLabel">
                                        Director:
                                    </div>
                                    <input type="text" placeholder="Enter Director Name" value={this.state.movieDirector} onChange={(e) => {this.setState({movieDirector: e.target.value})}} className="adminHomeDialogInput"></input>
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
                            <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "4%"}}>
                                <button className="adminHomeAddMovieSubmit" onClick={this.addMovie}>Add Movie</button>
                            </div>
                        </div>
                    </div>
                </Dialog>
                <div className="adminHomeHeader">
                    <div className="adminHomeWelcome">Welcome <b style={{fontWeight: "500", color: "#33CC00"}}>{this.state.username}</b></div>
                    <div className="adminHomeHeaderText">Recommender System</div>
                    <div className="adminHomeLogoutDiv">
                        <button className="adminHomeLogout" onClick={this.logoutUser}>Logout</button>
                    </div>
                </div>
                <div style={{width: "100%", display: "flex", justifyContent: "center"}}>
                    <div className="adminHomeCard">
                        <div className="adminHomeContent">
                            <div className="adminHomeContentHeader">Admin Options</div>
                        </div>
                        <div className="adminHomeContent">
                            <div className="adminHomeButton" onClick={this.toggleAddCriticDialog}>Add Critic</div>
                        </div>
                        <div className="adminHomeContent">
                            <div className="adminHomeButton" onClick={() => {this.getAllCritics();this.toggleRemoveCriticDialog()}}>Remove Critic</div>
                        </div>
                        <div className="adminHomeContent">
                            <div className="adminHomeButton" onClick={() => {this.getAllGenres();this.toggleAddMovieDialog()}}>Add Movie</div>
                        </div>
                    </div>
                </div>
                <div style={{width: "100%", textAlign: "center", fontSize: "30px", fontWeight: "600", marginTop: "3%", marginBottom: "1%"}}>Admin Analytics</div>
                <div style={{width: "100%", display: "flex", justifyContent: "center", marginTop: "1%"}}>
                    <div style={{width: "30%"}}>
                        <TableContainer component={Paper}>
                            <Table aria-label="simple table">
                                <TableBody>
                                {[
                                    <TableRow key="Total Movies">
                                        <TableCell component="th" scope="row">
                                            <b>Total Movies</b>
                                        </TableCell>
                                        <TableCell align="right">{this.state.analyticsDic.numMovies}</TableCell>
                                    </TableRow>,
                                    <TableRow key="Total Users">
                                        <TableCell component="th" scope="row">
                                            <b>Total Users</b>
                                        </TableCell>
                                        <TableCell align="right">{this.state.analyticsDic.numUsers}</TableCell>
                                    </TableRow>,
                                    <TableRow key="Total Critics">
                                        <TableCell component="th" scope="row">
                                            <b>Total Critics</b>
                                        </TableCell>
                                        <TableCell align="right">{this.state.analyticsDic.numCritics}</TableCell>
                                    </TableRow>,
                                    <TableRow key="Total Movie Ratings">
                                        <TableCell component="th" scope="row">
                                            <b>Total Movie Ratings</b>
                                        </TableCell>
                                        <TableCell align="right">{this.state.analyticsDic.numRatings}</TableCell>
                                    </TableRow>,
                                    <TableRow key="Total Movie Reviews">
                                        <TableCell component="th" scope="row">
                                            <b>Total Movie Reviews</b>
                                        </TableCell>
                                        <TableCell align="right">{this.state.analyticsDic.numReviews}</TableCell>
                                    </TableRow>

                                ]}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </div>
                </div>
            </div>
        )
    }
}
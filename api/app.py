from logging import currentframe
from os import stat
from re import M
import time, json
from datetime import datetime as dts
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint
from flask_login import LoginManager,login_user, logout_user, login_required, current_user,UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from py2neo import Graph
import pandas as pd
import numpy as np

app = Flask(__name__)

app.config['SECRET_KEY'] = '9OLWxND4o83j4K4iuopO'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True

critic_weight=5.0
offset = 50


db = SQLAlchemy(app)
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True) # primary keys are required by SQLAlchemy
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable = False)
    name = db.Column(db.String(1000), nullable=False)
    gender = db.Column(db.String(20), CheckConstraint("gender in ('Male', 'Female', 'Other')"))
    dob = db.Column(db.DateTime)
    isCritic = db.Column(db.Boolean, nullable=False)

    def __init__(self, username, password, name, gender, dob, isCritic=False):
        self.username = username
        self.password = password
        self.name = name
        self.gender = gender
        self.dob = dob
        self.isCritic = isCritic

db.init_app(app)
login_manager = LoginManager()
login_manager.login_view = '/login'
login_manager.init_app(app)

graph = Graph(name="recommendersystem",user="neo4j",password="werock1234")

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/checkUserLoggedIn', methods=['GET'])
def checkUserLoggedIn():
    if current_user.is_authenticated:
        return {'isUserLoggedIn': True, 'isAdmin': current_user.id==1, 'isCritic': current_user.isCritic}
    else:
        return {'isUserLoggedIn': False, 'isAdmin': False, 'isCritic': False}

@app.route('/loginUser', methods=['POST'])
def loginUser():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            password = data['password'].strip()
            user = User.query.filter_by(username = username).first()
            if not user:
                return {'loggedIn': False, 'loginerror': "Username does not exist",'isAdmin': False, 'isCritic': False}
            elif not check_password_hash(user.password, password):
                return {'loggedIn': False, 'loginerror': "Invalid Password",'isAdmin': False, 'isCritic': False}
            else:
                login_user(user, remember=False)
                return {'loggedIn': True, 'loginerror': "NA",'isAdmin': user.id==1, 'isCritic': user.isCritic}
        except Exception as e:
            return {'loggedIn': False, 'loginerror': "Unknown Error",'isAdmin': False, 'isCritic': False}

@app.route('/registerUser', methods=['POST'])
def registerUser():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            password = data['password'].strip()
            name = data['name'].strip()
            gender = data['gender'].strip()
            dob = data['dob'].strip()
            dtsObj = dts.strptime(dob,'%Y-%m-%d')
            user = User.query.filter_by(username = username).first()
            if user:
                return {'loggedIn': False, 'registererror': "Username already exists"}
            newuser = User(username,generate_password_hash(password,method='sha256'),name,gender,dtsObj)
            db.session.add(newuser)
            tx = graph.begin()
            statement = "CREATE (a:User {username: $username, name: $name, gender: $gender, dob: $dob})"
            tx.run(statement, {'username': username, 'name': name, 'gender': gender, 'dob': dob})
            db.session.commit()
            tx.commit()
            login_user(newuser, remember=False)
            return {'loggedIn': True, 'registererror': "NA"}
        except Exception as e:
            return {'loggedIn': False, 'registererror': "Unknown Error"}

@app.route('/logoutUser', methods=['POST'])
@login_required
def logoutUser():
    if request.method == 'POST':
        try:
            logout_user()
            return {'loggedOut': True, 'logoutError': "NA"}
        except Exception as e:
            return {'loggedOut': False, 'logoutError': "Unknown Error"}

@app.route('/getUserDetails',methods=['GET'])
def getUserDetails():
    if current_user.is_authenticated:
        return {'isUserLoggedIn': True, 'username': current_user.name, 'isAdmin': current_user.id==1, 'isCritic': current_user.isCritic}
    else:
        return {'isUserLoggedIn': False, 'username': "", 'isAdmin': False, 'isCritic': False}

@app.route('/getMovieList',methods=['POST'])
@login_required
def getMovieList():
    if current_user.is_authenticated and request.method=='POST':
        data = json.loads(request.data)
        searchText = data["searchText"].strip().lower()
        searchOption = data["searchOption"].strip()
        currentPage = data["currentPage"]
        skipValue = (currentPage-1)*offset
        tx = graph.begin()
        if(searchOption=="Title"):
            statement = "MATCH (m:Movies),(u:User {username: $username}) where toLower(m.title) contains $searchText and not ((m)<-[:rated]-(u)) CALL { WITH m,u OPTIONAL MATCH (m)-[:is_genre]->(g:Genres)<-[:likedGenre]-(u) return (coalesce(count(g),0)+1) as score1 } CALL { WITH m,u OPTIONAL MATCH (m)<--(b:Celebrity)<-[:favorite]-(u) return (coalesce(count(b),0)+1) as score2}  return m,score1*score2*(m.avg_rating) as score ORDER BY score DESC SKIP $skipValue LIMIT $offset;"
            statement1 = "MATCH (m:Movies), (u:User {username: $username}) WHERE toLower(m.title) contains $searchText and not ((m)<-[:rated]-(u)) RETURN count(m);"
        elif(searchOption=="Actor"):
            statement = "MATCH (a:Celebrity)-[:acted_in]->(m:Movies),(u:User {username: $username}) where toLower(a.name) contains $searchText and not ((m)<-[:rated]-(u))  CALL { WITH m,u OPTIONAL MATCH (m)-[:is_genre]->(g:Genres)<-[:likedGenre]-(u) return (coalesce(count(g),0)+1) as score1 } CALL { WITH m,u OPTIONAL MATCH (m)<--(b:Celebrity)<-[:favorite]-(u) return (coalesce(count(b),0)+1) as score2}  return m,score1*score2*(m.avg_rating) as score ORDER BY score DESC SKIP $skipValue LIMIT $offset;"
            statement1 = "MATCH (a:Celebrity)-[:acted_in]->(m:Movies),(u:User {username: $username}) where toLower(a.name) contains $searchText and not ((m)<-[:rated]-(u)) RETURN count(m);"
        elif(searchOption=="Director"):
            statement = "MATCH (a:Celebrity)-[:directed]->(m:Movies),(u:User {username: $username}) where toLower(a.name) contains $searchText and not ((m)<-[:rated]-(u))  CALL { WITH m,u OPTIONAL MATCH (m)-[:is_genre]->(g:Genres)<-[:likedGenre]-(u) return (coalesce(count(g),0)+1) as score1 } CALL { WITH m,u OPTIONAL MATCH (m)<--(b:Celebrity)<-[:favorite]-(u) return (coalesce(count(b),0)+1) as score2}  return m,score1*score2*(m.avg_rating) as score ORDER BY score DESC SKIP $skipValue LIMIT $offset;"
            statement1 = "MATCH (a:Celebrity)-[:directed]->(m:Movies),(u:User {username: $username}) where toLower(a.name) contains $searchText and not ((m)<-[:rated]-(u)) RETURN count(m);"
        elif(searchOption=="Year"):
            statement = "MATCH (m:Movies),(u:User {username: $username}) where m.year_released = $searchText and not ((m)<-[:rated]-(u)) CALL { WITH m,u OPTIONAL MATCH (m)-[:is_genre]->(g:Genres)<-[:likedGenre]-(u) return (coalesce(count(g),0)+1) as score1 } CALL { WITH m,u OPTIONAL MATCH (m)<--(b:Celebrity)<-[:favorite]-(u) return (coalesce(count(b),0)+1) as score2}  return m,score1*score2*(m.avg_rating) as score ORDER BY score DESC SKIP $skipValue LIMIT $offset;"
            statement1 = "MATCH (m:Movies),(u:User {username: $username}) where m.year_released = $searchText and not ((m)<-[:rated]-(u)) RETURN count(m);"
            searchText = int(searchText)
        movieList = tx.run(statement, {'username': current_user.username, 'searchText': searchText, 'offset': offset, 'skipValue': skipValue}).data()
        numMovies = tx.run(statement1, {'username': current_user.username,'searchText': searchText}).data()[0]['count(m)']
        maxPageNumber = numMovies//offset if numMovies%offset==0 else 1 + numMovies//offset

        ans = []
        for x in movieList:
            y = x['m']
            movieEntry = {}
            movieEntry['id'] = y['movie_id']
            movieEntry['title'] = y['title']
            movieEntry['year'] = y['year_released']
            movieEntry['rating'] = round(y['avg_rating'],2)
            statement = "MATCH (m:Movies {movie_id: $movie_id})-[:is_genre]->(g:Genres) return g;"
            genres = tx.run(statement, {'movie_id': y['movie_id']}).data()
            genreList = [g['g']['name'] for g in genres]
            movieEntry['genre'] = ", ".join(genreList)
            movieEntry['genreList'] = genreList
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:acted_in]-(g:Celebrity) return g;"
            actors = tx.run(statement, {'movie_id': y['movie_id']}).data()            
            movieEntry['actors'] = [g['g']['name'] for g in actors]
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:directed]-(g:Celebrity) return g;"
            director = tx.run(statement, {'movie_id': y['movie_id']}).data()  
            movieEntry['director'] = director[0]['g']['name'] if (len(director)>0) else ""
            ans.append(movieEntry)
        return {'movieList': ans, 'totalPages': maxPageNumber, 'success': True, 'error': "NA"}

@app.route('/getMovieListCritic',methods=['POST'])
@login_required
def getMovieListCritic():
    if current_user.is_authenticated:
        data = json.loads(request.data)
        searchText = data["searchText"].strip().lower()
        searchOption = data["searchOption"].strip()
        currentPage = data["currentPage"]
        skipValue = (currentPage-1)*offset
        tx = graph.begin()
        if(searchOption=="Title"):
            statement = "MATCH (m:Movies) where toLower(m.title) contains $searchText return m SKIP $skipValue LIMIT $offset;"
            statement1 = "MATCH (m:Movies) WHERE toLower(m.title) contains $searchText RETURN count(m);"
        elif(searchOption=="Actor"):
            statement = "MATCH (m:Movies)<-[:acted_in]-(a:Celebrity) where toLower(a.name) contains $searchText return m SKIP $skipValue LIMIT $offset; "
            statement1 = "MATCH (m:Movies)<-[:acted_in]-(a:Celebrity) where toLower(a.name) contains $searchText RETURN count(m);"
        elif(searchOption=="Director"):
            statement = "MATCH (m:Movies)<-[:directed]-(a:Celebrity) where toLower(a.name) contains $searchText return m SKIP $skipValue LIMIT $offset; "
            statement1 = "MATCH (m:Movies)<-[:directed]-(a:Celebrity) where toLower(a.name) contains $searchText RETURN count(m);"
        elif(searchOption=="Year"):
            statement = "MATCH (m:Movies) where m.year_released = $searchText return m SKIP $skipValue LIMIT $offset;"
            statement1 = "MATCH (m:Movies) where m.year_released = $searchText RETURN count(m);"
            searchText = int(searchText)
        movieList = tx.run(statement, {'searchText': searchText, 'offset': offset, 'skipValue': skipValue}).data()
        numMovies = tx.run(statement1, {'searchText': searchText}).data()[0]['count(m)']
        maxPageNumber = numMovies//offset if numMovies%offset==0 else 1 + numMovies//offset
        ans = []
        for x in movieList:
            y = x['m']
            movieEntry = {}
            movieEntry['id'] = y['movie_id']
            movieEntry['title'] = y['title']
            movieEntry['year'] = y['year_released']
            movieEntry['rating'] = round(y['avg_rating'],2)
            statement = "MATCH (m:Movies {movie_id: $movie_id})-[:is_genre]->(g:Genres) return g;"
            genres = tx.run(statement, {'movie_id': y['movie_id']}).data()
            genreList = [g['g']['name'] for g in genres]
            movieEntry['genre'] = ", ".join(genreList)
            movieEntry['genreList'] = genreList
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:acted_in]-(g:Celebrity) return g;"
            actors = tx.run(statement, {'movie_id': y['movie_id']}).data()            
            movieEntry['actors'] = [g['g']['name'] for g in actors]
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:directed]-(g:Celebrity) return g;"
            director = tx.run(statement, {'movie_id': y['movie_id']}).data()  
            movieEntry['director'] = director[0]['g']['name'] if (len(director)>0) else ""
            ans.append(movieEntry)
        return {'movieList': ans, 'totalPages': maxPageNumber, 'success': True, 'error': "NA"}

@app.route('/getWatchHistory',methods=['GET'])
@login_required
def getWatchHistory():
    if current_user.is_authenticated:
        tx = graph.begin()
        statement = "MATCH (p:User {username: $username})-[:rated]->(m:Movies) return m;"
        movieList = tx.run(statement, {'username': current_user.username}).data()
        ans = []
        for x in movieList:
            y = x['m']
            movieEntry = {}
            movieEntry['id'] = y['movie_id']
            movieEntry['title'] = y['title']
            movieEntry['year'] = y['year_released']
            movieEntry['rating'] = round(y['avg_rating'],2)
            statement = "MATCH (m:Movies {movie_id: $movie_id})-[:is_genre]->(g:Genres) return g;"
            genres = tx.run(statement, {'movie_id': y['movie_id']}).data()
            genreList = [g['g']['name'] for g in genres]
            movieEntry['genre'] = ", ".join(genreList)
            movieEntry['genreList'] = genreList
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:acted_in]-(g:Celebrity) return g;"
            actors = tx.run(statement, {'movie_id': y['movie_id']}).data()            
            movieEntry['actors'] = [g['g']['name'] for g in actors]
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:directed]-(g:Celebrity) return g;"
            director = tx.run(statement, {'movie_id': y['movie_id']}).data()  
            movieEntry['director'] = director[0]['g']['name'] if (len(director)>0) else ""
            ans.append(movieEntry)
        return {'watchHistory': ans}

@app.route('/getFriendRecommendations',methods=['GET'])
@login_required
def getFriendRecommendations():
    if current_user.is_authenticated:
        tx = graph.begin()
        statement = "MATCH (a:Recommendation {friend2: $username})-[:recommending_user]->(b:User) return b;"
        friendList = tx.run(statement, {'username': current_user.username}).data()
        friendRecs = []
        for friendTemp in friendList:
            friend = friendTemp['b']
            friendEntry = {}
            friendEntry["name"] = friend['username']
            statement = "MATCH (a:Recommendation {friend1: $friendUsername, friend2: $username})-[:movie_recommended]->(m:Movies) return m;"
            movies = tx.run(statement, {'username': current_user.username, 'friendUsername': friend['username']}).data()
            if(len(movies)==0): 
                continue
            friendEntry["movies"] = []
            for j in movies:
                movie = j['m']
                movieEntry = {}
                movieEntry['id'] = movie['movie_id']
                movieEntry['title'] = movie['title']
                movieEntry['year'] = movie['year_released']
                movieEntry['rating'] = round(movie['avg_rating'],2)
                movieEntry['duration'] = movie['duration']
                statement = "MATCH (m:Movies {movie_id: $movie_id})-[:is_genre]->(g:Genres) return g;"
                genres = tx.run(statement, {'movie_id': movie['movie_id']}).data()
                genreList = [g['g']['name'] for g in genres]
                movieEntry['genre'] = ", ".join(genreList)
                movieEntry['genreList'] = genreList
                statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:acted_in]-(g:Celebrity) return g;"
                actors = tx.run(statement, {'movie_id': movie['movie_id']}).data()            
                movieEntry['actors'] = [g['g']['name'] for g in actors]
                statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:directed]-(g:Celebrity) return g;"
                director = tx.run(statement, {'movie_id': movie['movie_id']}).data()  
                movieEntry['director'] = director[0]['g']['name'] if (len(director)>0) else ""
                reviews = []
                statement = "MATCH (m:Movies {movie_id: $movie_id})<-[r:review]-(g:Critic) return g,r.review_text;"
                reviewtemp = tx.run(statement, {'movie_id': movie['movie_id']}).data()
                for i in reviewtemp:
                    reviewDic = {}
                    reviewDic['reviewedBy'] = i['g']['name']
                    reviewDic['content'] = i['r.review_text']
                    reviews.append(reviewDic)
                movieEntry['reviews'] = reviews
                movieEntry['numUsers'] = movie['no_user_ratings']
                friendEntry["movies"].append(movieEntry)
            friendRecs.append(friendEntry)
        return {"friendRecs":friendRecs}

@app.route('/getFriendList',methods=['GET'])
@login_required
def getFriendList():
    if current_user.is_authenticated:
        try:
            tx=graph.begin()
            statement = "MATCH (p:User {username: $username})-[:friend]-(q:User) return q"
            friendList = tx.run(statement, {'username': current_user.username}).data()
            friendList = [x['q'] for x in friendList]
            return {"friendList": friendList, "error":"NA"}
        except Exception as e:
            return {"friendList":[], "error": "Unknown Error"}

@app.route('/getAllGenres',methods=['GET'])
@login_required
def getAllGenres():
    if current_user.is_authenticated:
        tf = graph.begin()
        statement = "MATCH (p:Genres) return p"
        x = tf.run(statement).data()
        genreList = [i['p'] for i in x]
        r = lambda : np.random.randint(0,255)
        for x in genreList:
            x['color'] = '#%02X%02X%02X' % (r(),r(),r())
        return {'genreList': genreList}

@app.route('/getLikedGenres',methods=['GET'])
@login_required
def getLikedGenres():
    if current_user.is_authenticated:
        tf = graph.begin()
        statement = "MATCH (p:User {username: $username })-[:likedGenre]->(g:Genres) return g"
        x = tf.run(statement, {'username': current_user.username}).data()
        liked = [i['g']['name'] for i in x]
        return {'likedGenres': liked}

@app.route('/saveGenres', methods=['POST'])
@login_required
def saveGenres():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            tx = graph.begin()
            for x in data['likedGenres']:
                statement = "MATCH (a:User {username: $username}),(b:Genres {name: $genrename}) MERGE (a)-[r:likedGenre]->(b) RETURN r;"
                tx.run(statement, {'username': current_user.username, 'genrename': x})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/getFriendRequests',methods=['GET'])
@login_required
def getFriendRequests():
    if current_user.is_authenticated:
        tx = graph.begin()
        statement = "MATCH (p:User {username: $username})<-[:request]-(q:User) return q"
        reqList = tx.run(statement, {'username': current_user.username}).data()
        reqList = [x['q'] for x in reqList]
        for x in reqList:
            statement = "MATCH (p:User {username: $username })-[:likedGenre]->(g:Genres) return g"
            genresList = tx.run(statement, {'username': x['username']}).data()
            genresList = [y['g']['name'] for y in genresList]
            x['likedGenres'] = ", ".join(genresList)

        return {"requestQueue": reqList}

@app.route('/getAllUsers',methods=['GET'])
@login_required
def getAllUsers():
    if current_user.is_authenticated:
        tx = graph.begin()
        statement = "MATCH (p:User { username: $username}),(q:User) where not ((p)-[:friend]-(q)) and q.username <> $username return q;"
        reqList = tx.run(statement, {'username': current_user.username}).data()
        reqList = [x['q'] for x in reqList]
        for x in reqList:
            statement = "MATCH (p:User {username: $username })-[:likedGenre]->(g:Genres) return g"
            genresList = tx.run(statement, {'username': x['username']}).data()
            genresList = [y['g']['name'] for y in genresList]
            x['likedGenres'] = ", ".join(genresList)

        return {"userList": reqList}

@app.route('/removeFriend', methods=['POST'])
@login_required
def removeFriend():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            tx=graph.begin()
            statement = "MATCH (p:User {username: $username})-[r:friend]-(q:User {username: $friendUsername}) delete r;"
            tx.run(statement, {'username': current_user.username, 'friendUsername': username})
            statement = "MATCH (r:Recommendation) where (r.friend1 = $friendUsername and r.friend2 = $username) or (r.friend2 = $friendUsername and r.friend1 = $username) detach delete r"
            tx.run(statement, {'username': current_user.username, 'friendUsername': username})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/sendRequestToUser', methods=['POST'])
@login_required
def sendRequestToUser():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            tx = graph.begin()
            statement = "MATCH (p:User {username: $username}),(q:User {username: $friendUsername}) MERGE (p)-[r:request]->(q) return r;"
            tx.run(statement, {'username': current_user.username, 'friendUsername': username})
            tx.commit()
            return {'requestSent': True, 'error': "NA"}
        except Exception as e:
            return {'requestSent': False, 'error': "Unknown Error"}

@app.route('/addCritic', methods=['POST'])
@login_required
def addCritic():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            password = data['password'].strip()
            name = data['name'].strip()
            gender = data['gender'].strip()
            dob = data['dob'].strip()
            dtsObj = dts.strptime(dob,'%Y-%m-%d')
            user = User.query.filter_by(username = username).first()
            if user:
                return {'success': False, 'error': "Username already exists"}
            newCritic = User(username,generate_password_hash(password,method='sha256'),name,gender,dtsObj,True)
            db.session.add(newCritic)
            tx = graph.begin()
            statement = "MERGE (p:Critic {username: $username,name: $name,gender: $gender,dob: $dob})"
            tx.run(statement, {'username': username, 'name': name, 'gender': gender, 'dob': dob})
            db.session.commit()
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/getAllCritics', methods=['GET'])
@login_required
def getAllCritics():
    if current_user.is_authenticated:
        criticList = [critic.username for critic in User.query.filter_by(isCritic = True)]
        # criticList = [f"Critic{i}" for i in range(1,21)]
        return {"criticList": criticList, "error": ""}

@app.route('/removeCritic', methods=['POST'])
@login_required
def removeCritic():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            user = User.query.filter_by(username = username).first()
            if not user:
                return {'success': False, 'error': "Username does not exist"}
            elif not user.isCritic:
                return {'success': False, 'error': "Given username is not a Critic"}
            tx = graph.begin()
            statement = "MATCH (p:Critic {username: $username})-[r:review]->(m:Movies) return r,m.movie_id"
            result = tx.run(statement, {'username': current_user.username}).data()
            for x in result:
                oldRating = x['r']['rating']
                statement = "MATCH (m:Movies {movie_id: $movie_id}) SET m.avg_rating = 1.0*(m.avg_rating*(m.no_user_ratings+$critic_weight*m.no_critic_ratings)- $critic_weight*$oldRating)/(m.no_user_ratings+$critic_weight*(m.no_critic_ratings-1)),m.no_critic_ratings = m.no_critic_ratings-1  return m"
                tx.run(statement, {'movie_id': x['m.movie_id'], 'critic_weight': critic_weight, 'oldRating': oldRating})
            statement = "MATCH (p:Critic {username: $username}) detach delete p "
            tx.run(statement, {'username': username})
            db.session.delete(user)
            db.session.commit()
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/addFriend', methods=['POST'])
@login_required
def addFriend():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            tx = graph.begin()
            statement = "MATCH (p:User {username: $friendUsername}),(q:User {username: $username}) CREATE (p)-[r:friend]->(q) return r;"
            tx.run(statement,{'friendUsername': username, 'username': current_user.username})
            statement = "MATCH (p:User {username: $friendUsername'})-[r:request]-(q:User {username: $username}) DELETE r;"
            tx.run(statement,{'friendUsername': username, 'username': current_user.username})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/deleteFriendRequest', methods=['POST'])
@login_required
def deleteFriendRequest():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            tx = graph.begin()
            statement = "MATCH (p:User {username: $friendUsername})-[r:request]->(q:User {username: $username}) DELETE r;"
            tx.run(statement, {'username': current_user.username, 'friendUsername': username})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/recommendFriends', methods=['POST'])
@login_required
def recommendFriends():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            tx = graph.begin()
            movie_id = data['movie_id']
            for x in data['friendList']:
                statement = "MERGE (a:Recommendation {friend1: $username, friend2: $friendUsername})"
                tx.run(statement, {'friendUsername': x, 'username': current_user.username})
                statement = "MATCH (a:User {username: $username}),(b:Recommendation {friend1: $username, friend2: $friendUsername}),(c:User {username: $friendUsername}),(d:Movies {movie_id: $movie_id}) MERGE (b)-[r:recommending_user]->(a) MERGE (b)-[q:to_whom_recommended]->(c) MERGE (b)-[p:movie_recommended]->(d) RETURN r;"
                tx.run(statement, {'friendUsername': x,'username': current_user.username, 'movie_id': movie_id})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/markFavouriteDirector', methods=['POST'])
@login_required
def markFavouriteDirector():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            directorName = data['directorName'].strip()
            tx = graph.begin()
            statement = "MATCH (p:User {username: $username}),(c:Celebrity {name: $directorName}) MERGE (p)-[r:favorite]->(c) return r"
            tx.run(statement,{'username': current_user.username, 'directorName': directorName})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/markFavouriteActors', methods=['POST'])
@login_required
def markFavouriteActors():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            actorList = data['actorList']
            tx = graph.begin()
            for x in actorList:
                x = x.strip()
                statement = "MATCH (p:User {username: $username}),(c:Celebrity {name: $actorname}) MERGE (p)-[r:favorite]->(c) return r"
                tx.run(statement,{'username': current_user.username, 'actorname': x})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/getAllNotifications',methods=['GET'])
@login_required
def getAllNotifications():
    if current_user.is_authenticated:
        tx = graph.begin()
        statement = "MATCH (a:LikedRecommendation {friend2: $username})-[:movie_recommended]->(m:Movies) return a,a.friend1,m"
        data = tx.run(statement, {'username': current_user.username}).data()
        nlist = []
        for i in data:
            d ={}
            d['username'] = i['a.friend1']
            d['movie_id'] = i['m']['movie_id']
            d['text'] = f"{i['m']['title']}: {d['username']} liked your recommendation"
            nlist.append(d)
        return {"notificationList": nlist}

@app.route('/sendLikedRecommendation', methods=['POST'])
@login_required
def sendLikedRecommendation():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data["username"].strip()
            movie_id = data["movie_id"]
            tx = graph.begin()
            statement = "MERGE (a:LikedRecommendation {friend1: $username, friend2: $friendUsername})"
            tx.run(statement, {'username': current_user.username, 'friendUsername': username})
            statement = "MATCH (a:User {username: $username}),(b:LikedRecommendation {friend1: $username, friend2: $friendUsername}),(c:User {username: $friendUsername}),(d:Movies {movie_id: $movie_id}) MERGE (b)-[r:recommending_user]->(c) MERGE (b)-[q:to_whom_recommended]->(a) MERGE (b)-[p:movie_recommended]->(d) RETURN r;"
            tx.run(statement, {'username': current_user.username, 'friendUsername': username, 'movie_id': movie_id})
            statement = "MATCH (b:Recommendation {friend2: $username, friend1: $friendUsername}),(d:Movies {movie_id: $movie_id}),(b)-[p:movie_recommended]->(d) DELETE p;"
            tx.run(statement, {'username': current_user.username, 'friendUsername': username, 'movie_id': movie_id})
            statement = "MATCH (b:Recommendation {friend2: $username, friend1: $friendUsername})-[:movie_recommended]->(d:Movies) return count(d);"
            value = tx.run(statement, {'username': current_user.username, 'friendUsername': username}).data()
            value = value[0]['count(d)']
            if(value==0):
                statement = "MATCH (b:Recommendation {friend2: $username, friend1: $friendUsername}) detach delete b"
                tx.run(statement, {'username': current_user.username, 'friendUsername': username})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/removeRecommendation', methods=['POST'])
@login_required
def removeRecommendation():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data["username"].strip()
            movie_id = data["movie_id"]
            tx = graph.begin()
            statement = "MATCH (b:Recommendation {friend2: $username, friend1: $friendUsername}),(d:Movies {movie_id: $movie_id}),(b)-[p:movie_recommended]->(d) DELETE p;"
            tx.run(statement, {'username': current_user.username, 'friendUserName': username, 'movie_id': movie_id})
            statement = "MATCH (b:Recommendation {friend2: $username, friend1: $friendUsername})-[:movie_recommended]->(d:Movies) return count(d);"
            value = tx.run(statement, {'username': current_user.username, 'friendUserName': username}).data()
            value = value[0]['count(d)']
            if(value==0):
                statement = "MATCH (b:Recommendation {friend2: $username, friend1: $friendUsername}) detach delete b"
                tx.run(statement, {'username': current_user.username, 'friendUserName': username})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/removeNotification', methods=['POST'])
@login_required
def removeNotification():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data["username"].strip()
            movie_id = data["movie_id"]
            tx = graph.begin()
            statement = "MATCH (b:LikedRecommendation {friend2: $username, friend1: $friendUsername}),(d:Movies {movie_id: $movie_id}),(b)-[p:movie_recommended]->(d) DELETE p;"
            tx.run(statement, {'username': current_user.username, 'friendUserName': username, 'movie_id': movie_id})
            statement = "MATCH (b:LikedRecommendation {friend2: $username, friend1: $friendUsername})-[:movie_recommended]->(d:Movies) return count(d);"
            value = tx.run(statement, {'username': current_user.username, 'friendUserName': username}).data()
            value = value[0]['count(d)']
            if(value==0):
                statement = "MATCH (b:LikedRecommendation {friend2: $username, friend1: $friendUsername}) detach delete b"
                tx.run(statement, {'username': current_user.username, 'friendUserName': username})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/rateMovie',methods=['POST'])
@login_required
def rateMovie():
    if request.method == 'POST':
        try: 
            data = json.loads(request.data)
            rating = data['rating']
            movie_id = data['movie_id']
            tx = graph.begin()
            if(current_user.isCritic):
                statement = "MATCH (p:Critic {username: $username})-[r:review]->(m:Movies {movie_id: $movie_id}) return r "
                result = tx.run(statement, {'username': current_user.username, 'movie_id': movie_id}).data()
                exists = len(result)>0
                if(exists):
                    oldRating = result[0]['r']['rating']
                    statement = "MATCH (p:Critic {username: $username})-[r:review]->(m:Movies {movie_id: $movie_id}) SET r.rating = $rating return r "
                    tx.run(statement, {'username': current_user.username, 'movie_id': movie_id, 'rating': rating})
                    statement = "MATCH (m:Movies {movie_id: $movie_id}) SET m.avg_rating = m.avg_rating- $critic_weight*($oldRating-$rating)/(m.no_user_ratings+$critic_weight*m.no_critic_ratings) return m"
                    tx.run(statement, {'movie_id': movie_id,'critic_weight': critic_weight, 'oldRating': oldRating, 'rating': rating})
                else:
                    statement = "MATCH (p:Critic {username: $username}),(m:Movies {movie_id: $movie_id}) MERGE (p)-[r:review {rating: $rating }]->(m) return r "
                    tx.run(statement, {'username': current_user.username, 'movie_id': movie_id, 'rating': rating})
                    statement = "MATCH (m:Movies {movie_id: $movie_id}) SET m.avg_rating = 1.0*(m.avg_rating*(m.no_user_ratings+$critic_weight*m.no_critic_ratings)+$critic_weight*$rating)/($critic_weight+ m.no_user_ratings+$critic_weight*m.no_critic_ratings),m.no_critic_ratings = 1+m.no_critic_ratings return m"
                    tx.run(statement, {'movie_id': movie_id,'critic_weight': critic_weight, 'rating': rating})
            else:
                statement = "MATCH (p:User {username: $username})-[r:rated]->(m:Movies {movie_id: $movie_id}) return r "
                result = tx.run(statement, {'username': current_user.username, 'movie_id': movie_id}).data()
                exists = len(result)>0
                if(exists):
                    oldRating = result[0]['r']['rating']
                    statement = "MATCH (p:User {username: $username})-[r:rated]->(m:Movies {movie_id: $movie_id}) SET r.rating = $movie_id return r "
                    tx.run(statement, {'username': current_user.username, 'movie_id': movie_id, 'rating': rating})
                    statement = "MATCH (m:Movies {movie_id: $movie_id}) SET m.avg_rating = m.avg_rating- 1.0*($oldRating-$rating)/(m.no_user_ratings+$critic_weight*m.no_critic_ratings) return m"
                    tx.run(statement, {'movie_id': movie_id,'critic_weight': critic_weight, 'oldRating': oldRating, 'rating': rating})
                else:
                    statement = "MATCH (p:User {username: $username}),(m:Movies {movie_id: $movie_id}) MERGE (p)-[r:rated {rating: $rating }]->(m) return r "
                    tx.run(statement, {'username': current_user.username, 'movie_id': movie_id, 'rating': rating})
                    statement = "MATCH (m:Movies {movie_id: $movie_id}) SET m.avg_rating = 1.0*(m.avg_rating*(m.no_user_ratings+$critic_weight*m.no_critic_ratings)+$rating)/(1+ m.no_user_ratings+$critic_weight*m.no_critic_ratings),m.no_user_ratings = 1+m.no_user_ratings  return m"
                    tx.run(statement, {'movie_id': movie_id,'critic_weight': critic_weight, 'rating': rating})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/getMovieRating',methods=['POST'])
@login_required
def getMovieRating():
    if current_user.is_authenticated and request.method=='POST':
        try:
            data = json.loads(request.data)
            movie_id = data['movie_id']
            tx = graph.begin()
            rating = 0
            review_text = ""
            if(current_user.isCritic):
                statement = "MATCH (p:Critic {username: $username})-[r:review]->(m:Movies {movie_id: $movie_id}) return r"
                result = tx.run(statement, {'username': current_user.username, 'movie_id': movie_id}).data()
                rating = result[0]['r']['rating'] if len(result)>0 else 0
                review_text = result[0]['r']['review_text'] if len(result)>0 else ""
            else:
                statement = "MATCH (p:User {username: $username})-[r:rated]->(m:Movies {movie_id: $movie_id}) return r"
                result = tx.run(statement, {'username': current_user.username, 'movie_id': movie_id}).data()
                rating = result[0]['r']['rating'] if len(result)>0 else 0
            return {'rating': rating, 'review': review_text,'success': True, 'error': "NA"}
        except Exception as e:
            return {'rating': 0,'review': "",'success': False, 'error': "Unknown Error1"}

@app.route('/getMovieDetails',methods=['POST'])
@login_required
def getMovieDetails():
    if current_user.is_authenticated and request.method=='POST':
        try:
            data = json.loads(request.data)
            movie_id = data['movie_id']
            tx = graph.begin()
            statement = "MATCH (m:Movies {movie_id: $movie_id}) return m;"
            x = tx.run(statement, {'movie_id': movie_id}).data()
            y = x[0]['m']
            movieEntry = {}
            movieEntry['id'] = y['movie_id']
            movieEntry['title'] = y['title']
            movieEntry['year'] = y['year_released']
            movieEntry['rating'] = round(y['avg_rating'],2)
            movieEntry['duration'] = y['duration']
            statement = "MATCH (m:Movies {movie_id: $movie_id})-[:is_genre]->(g:Genres) return g;"
            genres = tx.run(statement, {'movie_id': y['movie_id']}).data()
            genreList = [g['g']['name'] for g in genres]
            movieEntry['genre'] = ", ".join(genreList)
            movieEntry['genreList'] = genreList
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:acted_in]-(g:Celebrity) return g;"
            actors = tx.run(statement, {'movie_id': y['movie_id']}).data()            
            movieEntry['actors'] = [g['g']['name'] for g in actors]
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[:directed]-(g:Celebrity) return g;"
            director = tx.run(statement, {'movie_id': y['movie_id']}).data()  
            movieEntry['director'] = director[0]['g']['name'] if (len(director)>0) else ""
            reviews = []
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[r:review]-(g:Critic) return g,r.review_text;"
            reviewtemp = tx.run(statement, {'movie_id': y['movie_id']}).data()
            for i in reviewtemp:
                reviewDic = {}
                reviewDic['reviewedBy'] = i['g']['name']
                reviewDic['content'] = i['r.review_text']
                reviews.append(reviewDic)
            movieEntry['reviews'] = reviews
            movieEntry['numUsers'] = y['no_user_ratings']
            return {'movieDic': movieEntry,'success': True,'error': "NA"}
        except Exception as e:
            return {'movieDic': {},'success': False, 'error': "Unknown Error2"}

@app.route('/addMovie', methods=['POST'])
@login_required
def addMovie():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            title = data['title'].strip()
            year_released = data['year']
            url = data['url'].strip()
            rating = float(data['rating'])
            duration = data['duration']
            directorName = data['director'].strip()
            actorList = data['actorList']
            genreList = data['genreList']
            tx = graph.begin()
            statement = "MATCH (m:Movies) return max(m.movie_id) as mid"
            movie_id = tx.run(statement).data()
            movie_id = movie_id[0]['mid']+1
            statement = "MERGE (m:Movies {movie_id: $movie_id,title: $title,year_released: $year_released,url: $url,avg_rating: $rating,no_user_ratings: 0,no_critic_ratings: 1,duration: $duration})"
            tx.run(statement,{'movie_id': movie_id, 'title': title, 'year_released': year_released, 'url': url, 'rating': rating, 'duration': duration})
            if(current_user.isCritic):
                statement = "MATCH (c:Critic {username: $username}),(m:Movies {movie_id: $movie_id}) MERGE (c)-[r:review {rating: $rating}]->(m) return r"
                tx.run(statement, {'username': current_user.username,'movie_id': movie_id, 'rating': rating})
            statement = "MATCH (c:Celebrity {name: $directorName}) return c"
            results = tx.run(statement, {'directorName': directorName}).data()
            if len(results)==0:
                statement = "MATCH (c:Celebrity) return max(c.id) as id"
                id = tx.run(statement).data()
                id = id[0]['id']+1
                statement = "MERGE (c:Celebrity {id: $id,name: $directorName, gender: 'Null', dob: 'Null'})"    
                tx.run(statement, {'id': id, 'directorName': directorName})
            statement = "MATCH (c:Celebrity {name: $directorName}), (m:Movies {movie_id: $movie_id}) MERGE (c)-[r:directed]->(m) return r"
            tx.run(statement, {'directorName': directorName, 'movie_id': movie_id})
            
            for actorName in actorList:
                actorName = actorName.strip()
                statement = "MATCH (c:Celebrity {name: $actorName}) return c"
                results = tx.run(statement, {'actorName': actorName}).data()
                if len(results)==0:
                    statement = "MATCH (c:Celebrity) return max(c.id) as id"
                    id = tx.run(statement).data()
                    id = id[0]['id']+1
                    statement = "MERGE (c:Celebrity {id: $id,name: $actorName, gender: 'Null', dob: 'Null'})"    
                    tx.run(statement, {'id': id, 'actorName': actorName})
                statement = "MATCH (c:Celebrity {name: $actorName}), (m:Movies {movie_id: $movie_id}) MERGE (c)-[r:acted_in]->(m) return r"
                tx.run(statement, {'actorName': actorName, 'movie_id': movie_id})

            for name in genreList:
                name = name.strip()
                statement = "MATCH (c:Genres {name: $name}), (m:Movies {movie_id: $movie_id}) MERGE (c)<-[r:is_genre]-(m) return r"
                tx.run(statement, {'name': name, 'movie_id': movie_id})

            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/modifyGenres',methods=['POST'])
@login_required
def modifyGenres():
    if current_user.is_authenticated and request.method=='POST':
        try:
            data = json.loads(request.data)
            movie_id = data['movie_id']
            genreList = data['genreList']
            tx =graph.begin()
            statement = "MATCH (m:Movies {movie_id: $movie_id})-[r:is_genre]->(g:Genres) delete r"
            tx.run(statement, {'movie_id': movie_id})
            for genre in genreList:
                genre = genre.strip()
                statement = "MATCH (m:Movies {movie_id: $movie_id}),(g:Genres {name: $name}) MERGE (m)-[r:is_genre]->(g) return r"
                tx.run(statement, {'movie_id': movie_id, 'name': genre})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/addReview',methods=['POST'])
@login_required
def addReview():
    if current_user.is_authenticated and request.method=='POST':
        try:
            data = json.loads(request.data)
            movie_id = data['movie_id']
            review_text = data['reviewText']
            tx =graph.begin()
            statement = "MATCH (m:Movies {movie_id: $movie_id})<-[r:review]-(g:Critic {username: $username}) return count(r)"
            result = tx.run(statement, {'movie_id': movie_id, 'username': current_user.username}).data()
            result = result[0]['count(r)']
            if(result>0):
                statement = "MATCH (m:Movies {movie_id: $movie_id})<-[r:review]-(g:Critic {username: $username}) SET r.review_text = $review_text return r"
            else:
                statement = "MATCH (m:Movies {movie_id: $movie_id}),(g:Critic {username: $username}) MERGE (m)<-[r:review {rating: 0,review_text: $review_text}]-(g) return r"
            tx.run(statement, {'movie_id': movie_id, 'username': current_user.username, 'review_text': review_text})
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

# @app.route('/getRecommendations', methods=['GET'])
# def getRecommendationsS1(user_id,threshold):
#     # In Strategy 1, the similarity between two users u1 and u2 is the proportion of movies they have in common
#     # The score of one given movie m is the proportion of users similar to u1 who rated m

#     query = (### Similarity normalization : count number of movies seen by u1 ###
#     # Count movies rated by u1 as countm
#     'MATCH (u1:`User` {user_id:$user_id})-[:`Has_rated`]->(m1:`Movie`) '
#     'WITH count(m1) as countm '
#     ### Score normalization : count number of users who are considered similar to u1 ###
#     # Retrieve all users u2 who share at least one movie with u1
#     'MATCH (u1:`User` {user_id:$user_id})-[:`Has_rated`]->(m1:`Movie`) '
#     'MATCH (m1)<-[r:`Has_rated`]-(u2:`User`) '
#     'WHERE NOT u2=u1 '
#     # Compute similarity
#     'WITH u2, countm, tofloat(count(r))/countm as sim '
#     # Keep users u2 whose similarity with u1 is above some threshold
#     'WHERE sim>$threshold '
#     # Count number of similar users as countu
#     'WITH count(u2) as countu, countm '
#     ### Recommendation ###
#     # Retrieve all users u2 who share at least one movie with u1
#     'MATCH (u1:`User` {user_id:$user_id})-[:`Has_rated`]->(m1:`Movie`) '
#     'MATCH (m1)<-[r:`Has_rated`]-(u2:`User`) '
#     'WHERE NOT u2=u1 '
#     # Compute similarity
#     'WITH u1, u2,countu, tofloat(count(r))/countm as sim '
#     # Keep users u2 whose similarity with u1 is above some threshold
#     'WHERE sim>$threshold '
#     # Retrieve movies m that were rated by at least one similar user, but not by u1
#     'MATCH (m:`Movie`)<-[r:`Has_rated`]-(u2) '
#     'WHERE NOT (m)<-[:`Has_rated`]-(u1) '
#     # Compute score and return the list of suggestions ordered by score
#     'RETURN DISTINCT m, tofloat(count(r))/countu as score ORDER BY score DESC LIMIT 20 ')
#     result = graph.run(query, {'user_id': user_id, 'threshold': threshold}).data()
#     return result
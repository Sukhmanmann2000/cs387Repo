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
                login_user(user, remember=True)
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
            db.session.commit()
            tx = graph.begin()
            statement = f'CREATE (a:User {{ username: "{username}", name: "{name}", gender: "{gender}", dob: "{dob}"}})'
            tx.run(statement)
            tx.commit()
            login_user(newuser, remember=True)
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
        searchText = data["searchText"].strip()
        searchOption = data["searchOption"].strip()
        tx = graph.begin()
        statement = f"MATCH (m:Movies) return m LIMIT 25;"
        movieList = tx.run(statement).data()
        ans = []
        for x in movieList:
            y = x['m']
            movieEntry = {}
            movieEntry['id'] = y['movie_id']
            movieEntry['title'] = y['title']
            movieEntry['year'] = y['year_released']
            movieEntry['rating'] = y['avg_rating']
            movieEntry['duration'] = y['duration']
            statement = f"MATCH (m:Movies {{movie_id: {y['movie_id']}}})-[:is_genre]->(g:Genres) return g;"
            genres = tx.run(statement).data()
            genreList = [g['g']['name'] for g in genres]
            movieEntry['genre'] = ", ".join(genreList)
            movieEntry['genreList'] = genreList
            statement = f"MATCH (m:Movies {{movie_id: {y['movie_id']}}})<-[:acted_in]-(g:Celebrity) return g;"
            actors = tx.run(statement).data()            
            movieEntry['actors'] = ", ".join([g['g']['name'] for g in actors])
            statement = f"MATCH (m:Movies {{movie_id: {y['movie_id']}}})<-[:directed]-(g:Celebrity) return g;"
            director = tx.run(statement).data()  
            movieEntry['director'] = director[0]['g']['name']
            reviews = []
            statement = f"MATCH (m:Movies {{movie_id: {y['movie_id']}}})<-[r:review]-(g:Critic) return g,r.review_text;"
            reviewtemp = tx.run(statement).data()
            for i in reviewtemp:
                reviewDic = {}
                reviewDic['reviewedBy'] = i['g']['name']
                reviewDic['content'] = i['r.review_text']
                reviews.append(reviewDic)
            movieEntry['reviews'] = reviews
            movieEntry['numUsers'] = y['no_user_ratings']
            ans.append(movieEntry)
        return {'movieList': ans}

@app.route('/getWatchHistory',methods=['GET'])
@login_required
def getWatchHistory():
    if current_user.is_authenticated:
        actors = ['Actor1','Actor2','Actor3']
        genres = ['Action', 'Horror', 'Thriller']
        movieList = []
        for i in range(12):
            movieEntry = {}
            movieEntry['id'] = i
            movieEntry['title'] = f"Movie {i}"
            movieEntry['year'] = i+1990
            movieEntry['rating'] = round(2+3*np.random.rand(),2)
            movieEntry['duration'] = 120
            movieEntry['genre'] = ", ".join(genres)
            movieEntry['genreList'] = genres
            movieEntry['actors'] = ", ".join(actors)
            movieEntry['director'] = 'Christopher Nolan'
            movieList.append(movieEntry)
            reviews = []
            for i in range(3):
                reviewDic = {}
                reviewDic['reviewedBy'] = f"Critic {i+1}"
                reviewDic['content'] = f"Review {i+1}"
                reviews.append(reviewDic)
            movieEntry['reviews'] = reviews
            movieEntry['numUsers'] = 100000
        return {'watchHistory': movieList}

@app.route('/getFriendRecommendations',methods=['GET'])
@login_required
def getFriendRecommendations():
    if current_user.is_authenticated:
        tx = graph.begin()
        statement = f"MATCH (a:Recommendation {{friend2: '{current_user.username}'}})-[:recommending_user]->(b:User) return b;"
        friendList = tx.run(statement).data()
        friendRecs = []
        for friendTemp in friendList:
            friend = friendTemp['b']
            friendEntry = {}
            friendEntry["name"] = friend['username']
            statement = f"MATCH (a:Recommendation {{friend1: '{friend['username']}', friend2: '{current_user.username}'}})-[:movie_recommended]->(m:Movies) return m;"
            movies = tx.run(statement).data()
            friendEntry["movies"] = []
            for j in movies:
                movie = j['m']
                movieEntry = {}
                movieEntry['id'] = movie['movie_id']
                movieEntry['title'] = movie['title']
                movieEntry['year'] = movie['year_released']
                movieEntry['rating'] = movie['avg_rating']
                movieEntry['duration'] = movie['duration']
                statement = f"MATCH (m:Movies {{movie_id: {movie['movie_id']}}})-[:is_genre]->(g:Genres) return g;"
                genres = tx.run(statement).data()
                genreList = [g['g']['name'] for g in genres]
                movieEntry['genre'] = ", ".join(genreList)
                movieEntry['genreList'] = genreList
                statement = f"MATCH (m:Movies {{movie_id: {movie['movie_id']}}})<-[:acted_in]-(g:Celebrity) return g;"
                actors = tx.run(statement).data()            
                movieEntry['actors'] = ", ".join([g['g']['name'] for g in actors])
                statement = f"MATCH (m:Movies {{movie_id: {movie['movie_id']}}})<-[:directed]-(g:Celebrity) return g;"
                director = tx.run(statement).data()  
                movieEntry['director'] = director[0]['g']['name']
                reviews = []
                statement = f"MATCH (m:Movies {{movie_id: {movie['movie_id']}}})<-[r:review]-(g:Critic) return g,r.review_text;"
                reviewtemp = tx.run(statement).data()
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
            statement = f"MATCH (p:User {{username: '{current_user.username}'}})-[:friend]-(q:User) return q"
            friendList = tx.run(statement).data()
            friendList = [x['q'] for x in friendList]
            return {"friendList": friendList, "error":"NA"}
        except Exception as e:
            return {"friendList":[], "error": "Unknown Error"}

@app.route('/getAllGenres',methods=['GET'])
@login_required
def getAllGenres():
    if current_user.is_authenticated:
        tf = graph.begin()
        statement = f"MATCH (p:Genres) return p"
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
        statement = f"MATCH (p:User {{username: '{current_user.username}' }})-[:likedGenre]->(g:Genres) return g"
        x = tf.run(statement).data()
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
                statement = f"MATCH (a:User {{username: '{current_user.username}'}}),(b:Genres {{name: '{x}'}}) MERGE (a)-[r:likedGenre]->(b) RETURN r;"
                tx.run(statement)
            tx.commit()
            return {'success': True, 'error': "NA"}
        except Exception as e:
            return {'success': False, 'error': "Unknown Error"}

@app.route('/getFriendRequests',methods=['GET'])
@login_required
def getFriendRequests():
    if current_user.is_authenticated:
        tx = graph.begin()
        statement = f"MATCH (p:User {{username: '{current_user.username}'}})<-[:request]-(q:User) return q"
        reqList = tx.run(statement).data()
        reqList = [x['q'] for x in reqList]
        for x in reqList:
            statement = f"MATCH (p:User {{username: '{x['username']}' }})-[:likedGenre]->(g:Genres) return g"
            genresList = tx.run(statement).data()
            genresList = [y['g']['name'] for y in genresList]
            x['likedGenres'] = ", ".join(genresList)

        return {"requestQueue": reqList}

@app.route('/getAllUsers',methods=['GET'])
@login_required
def getAllUsers():
    if current_user.is_authenticated:
        tx = graph.begin()
        statement = f"MATCH (p:User {{ username: '{current_user.username}'}}),(q:User) where not ((p)-[:friend]-(q)) and q.username <> '{current_user.username}' return q;"
        reqList = tx.run(statement).data()
        reqList = [x['q'] for x in reqList]
        for x in reqList:
            statement = f"MATCH (p:User {{username: '{x['username']}' }})-[:likedGenre]->(g:Genres) return g"
            genresList = tx.run(statement).data()
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
            statement = f"MATCH (p:User {{username: '{current_user.username}'}})-[r:friend]-(q:User {{username: '{username}'}}) delete r;"
            tx.run(statement)
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
            statement = f"MATCH (p:User {{username: '{current_user.username}'}}),(q:User {{username: '{username}'}}) MERGE (p)-[r:request]->(q) return r;"
            tx.run(statement)
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
            db.session.commit()
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
            db.session.delete(user)
            db.session.commit()
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
            statement = f"MATCH (p:User {{username: '{username}'}}),(q:User {{username: '{current_user.username}'}}) CREATE (p)-[r:friend]->(q) return r;"
            tx.run(statement)
            statement = f"MATCH (p:User {{username: '{username}'}})-[r:request]-(q:User {{username: '{current_user.username}'}}) DELETE r;"
            tx.run(statement)
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
            statement = f"MATCH (p:User {{username: '{username}'}})-[r:request]->(q:User {{username: '{current_user.username}'}}) DELETE r;"
            tx.run(statement)
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
                statement = f"MERGE (a:Recommendation {{friend1: '{current_user.username}', friend2: '{x}'}})"
                tx.run(statement)
                statement = f"MATCH (a:User {{username: '{current_user.username}'}}),(b:Recommendation {{friend1: '{current_user.username}', friend2: '{x}'}}),(c:User {{username: '{x}'}}),(d:Movies {{movie_id: {movie_id}}}) MERGE (b)-[r:recommending_user]->(a) MERGE (b)-[q:to_whom_recommended]->(c) MERGE (b)-[p:movie_recommended]->(d) RETURN r;"
                tx.run(statement)
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
            directorName = data['directorName']
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
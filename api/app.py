import time, json
from datetime import datetime as dts
from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager,login_user, logout_user, login_required, current_user,UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from py2neo import Graph
import pandas as pd

app = Flask(__name__)

app.config['SECRET_KEY'] = '9OLWxND4o83j4K4iuopO'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True

db = SQLAlchemy(app)
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True) # primary keys are required by SQLAlchemy
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100))
    name = db.Column(db.String(1000))
    gender = db.Column(db.String(20))
    dob = db.Column(db.DateTime, nullable=False)

    def __init__(self, username, password, name, gender, dob):
        self.username = username
        self.password = password
        self.name = name
        self.gender = gender
        self.dob = dob

db.init_app(app)
login_manager = LoginManager()
login_manager.login_view = '/login'
login_manager.init_app(app)

# db.create_all()
# graph = Graph(user="neo4j",password="werock1234")

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/checkUserLoggedIn', methods=['GET'])
def checkUserLoggedIn():
    return {'isUserLoggedIn': current_user.is_authenticated}

@app.route('/loginUser', methods=['POST'])
def loginUser():
    if request.method == 'POST':
        try:
            data = json.loads(request.data)
            username = data['username'].strip()
            password = data['password'].strip()
            user = User.query.filter_by(username = username).first()
            if not user:
                return {'loggedIn': False, 'loginerror': "Username does not exist"}
            elif not check_password_hash(user.password, password):
                return {'loggedIn': False, 'loginerror': "Invalid Password"}
            else:
                login_user(user, remember=True)
                return {'loggedIn': True, 'loginerror': "NA"}
        except Exception as e:
            return {'loggedIn': False, 'loginerror': "Unknown Error"}

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
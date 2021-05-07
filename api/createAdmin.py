from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint
from flask_login import LoginManager,login_user, logout_user, login_required, current_user,UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime as dts
from py2neo import Graph

graph = Graph(name="recommendersystem",user="neo4j",password="werock1234")

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

def printAllUsers():
    for user in User.query.all():
        print(f"id: {user.id}, Username: {user.username}, isCritic: {user.isCritic}")
    
db.drop_all()

tx = graph.begin()
statement = "MATCH (u: User) DETACH DELETE u;"
tx.run(statement)
statement = "MATCH (c: Critic) DETACH DELETE c;"
tx.run(statement)
statement = "MATCH (a: Admin) DETACH DELETE a;"
tx.run(statement)
tx.commit()

db.create_all()
dob = '2000-01-01'
dtsObj = dts.strptime(dob,'%Y-%m-%d')
admin = User('admin',generate_password_hash('werock1234',method='sha256'),'admin','Male',dtsObj)
db.session.add(admin)
db.session.commit()

tx = graph.begin()
statement = "CREATE (a:Admin {username: 'admin', name: 'admin', gender: 'Male', dob: '01-01-2000'})"
tx.run(statement)
tx.commit()

# # adding dummy users and making them friends
# statement = "CREATE (a:User {username: 'dummyuser1', name: 'dummyuser1'}),(b:User {username: 'dummyuser2', name: 'dummyuser2'})"
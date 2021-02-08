import time, json
from flask import Flask, request
from py2neo import Graph
import pandas as pd

app = Flask(__name__)
graph = Graph('http://neo4j:werock1234@localhost:7474/db/data/')


@app.route('/time')
def get_current_time():
    return {'time': time.time()}

@app.route('/help', methods=['POST'])
def get_current():
    if request.method == 'POST':
        data = json.loads(request.data)
        print(data)
        return {'time': [1,2]}

@app.route('/getRecommendations', methods=['GET'])
def getRecommendationsS1(user_id,threshold):
    # In Strategy 1, the similarity between two users u1 and u2 is the proportion of movies they have in common
    # The score of one given movie m is the proportion of users similar to u1 who rated m

    query = (### Similarity normalization : count number of movies seen by u1 ###
    # Count movies rated by u1 as countm
    'MATCH (u1:`User` {user_id:$user_id})-[:`Has_rated`]->(m1:`Movie`) '
    'WITH count(m1) as countm '
    ### Score normalization : count number of users who are considered similar to u1 ###
    # Retrieve all users u2 who share at least one movie with u1
    'MATCH (u1:`User` {user_id:$user_id})-[:`Has_rated`]->(m1:`Movie`) '
    'MATCH (m1)<-[r:`Has_rated`]-(u2:`User`) '
    'WHERE NOT u2=u1 '
    # Compute similarity
    'WITH u2, countm, tofloat(count(r))/countm as sim '
    # Keep users u2 whose similarity with u1 is above some threshold
    'WHERE sim>$threshold '
    # Count number of similar users as countu
    'WITH count(u2) as countu, countm '
    ### Recommendation ###
    # Retrieve all users u2 who share at least one movie with u1
    'MATCH (u1:`User` {user_id:$user_id})-[:`Has_rated`]->(m1:`Movie`) '
    'MATCH (m1)<-[r:`Has_rated`]-(u2:`User`) '
    'WHERE NOT u2=u1 '
    # Compute similarity
    'WITH u1, u2,countu, tofloat(count(r))/countm as sim '
    # Keep users u2 whose similarity with u1 is above some threshold
    'WHERE sim>$threshold '
    # Retrieve movies m that were rated by at least one similar user, but not by u1
    'MATCH (m:`Movie`)<-[r:`Has_rated`]-(u2) '
    'WHERE NOT (m)<-[:`Has_rated`]-(u1) '
    # Compute score and return the list of suggestions ordered by score
    'RETURN DISTINCT m, tofloat(count(r))/countu as score ORDER BY score DESC LIMIT 20 ')
    result = graph.run(query, {'user_id': user_id, 'threshold': threshold}).data()
    return result
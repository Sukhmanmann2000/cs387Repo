from py2neo import Graph
import pandas as pd
import numpy as np

graph = Graph(user="neo4j",password="werock1234")

# Loading user-related data
user = pd.read_csv('ml-100k/u.user', sep='|', header=None, names=['id','age','gender','occupation','zip code'])
n_u = user.shape[0]

# Loading genres of movies
genre = pd.read_csv('ml-100k/u.genre', sep='|', header=None, names=['name', 'id'])
genre = genre.astype({'id': 'int'})
n_g = genre.shape[0]

# Loading item-related data
# Format : id | title | release date | | IMDb url | "genres"
# where "genres" is a vector of size n_g : genres[i]=1 if the movie belongs to genre i
movie_col = ['id', 'title','release date', 'useless', 'IMDb url']
movie_col = movie_col + genre['id'].tolist()
movie = pd.read_csv('ml-100k/u.item', sep='|', header=None, names=movie_col, encoding='latin-1')
movie = movie.astype({'id': 'int'})
movie = movie.fillna('unknown')
n_m = movie.shape[0]

# Loading ratings
rating_col = ['user_id', 'item_id','rating', 'timestamp']
rating = pd.read_csv('ml-100k/u.data', sep='\t' ,header=None, names=rating_col)
n_r = rating.shape[0]

def addUsers():
    tx = graph.begin()
    statement = "MERGE (a:`User`{user_id:$A}) RETURN a"
    for u in user['id']:
        tx.run(statement, {"A": u})

    tx.commit()

def addGenres():
    tx = graph.begin()
    statement = "MERGE (a:`Genre`{genre_id:$A, name:$B}) RETURN a"
    for g,row in genre.iterrows() :
        tx.run(statement, {"A": row.iloc[1], "B": row.iloc[0]})

    tx.commit()

def addMovies():
    ##### Create the Movie nodes with properties movie_id, title and url ; then create the Is_genre edges #####
    tx = graph.begin()
    statement1 = "MERGE (a:`Movie`{movie_id:$A, title:$B, url:$C}) RETURN a"
    statement2 = ("MATCH (t:`Genre`{genre_id:$D}) "
                "MATCH (a:`Movie`{movie_id:$A, title:$B, url:$C}) MERGE (a)-[r:`Is_genre`]->(t) RETURN r")

    # Looping over movies m
    shouldCommit = False
    for m,row in movie.iterrows() :
        # Create "Movie" node
        shouldCommit = True
        tx.run(statement1, {"A": row.loc['id'], "B": row.loc['title'], "C": row.loc['IMDb url']})
        # is_genre : vector of size n_g, is_genre[i]=True if Movie m belongs to Genre i
        is_genre = row.iloc[-19:]==1
        related_genres = genre[is_genre].axes[0].values

        # Looping over Genres g which satisfy the condition : is_genre[i]=True
        for g in related_genres :
            # Retrieve node corresponding to genre g, and create relation between g and m
            tx.run(statement2,\
                    {"A": int(row.loc['id']), "B": row.loc['title'], "C": row.loc['IMDb url'], "D": int(g)})

        # Every 100 movies, push queued statements to the server for execution to avoid one massive "commit"
        if m%100==0: 
            tx.commit()
            tx = graph.begin()
            shouldCommit = False

    # End with a "commit"
    if shouldCommit:
        tx.commit()

def addUserMovieRels():
    tx = graph.begin()

    ##### Create the Has_rated edges, with rating as property #####
    statement = ("MATCH (u:`User`{user_id:$A}) "
                "MATCH (m:`Movie`{movie_id:$C}) MERGE (u)-[r:`Has_rated`{rating:$B}]->(m) RETURN r")

    # Looping over ratings
    shouldCommit = False
    totalLen = len(rating)
    for r,row in rating.iterrows() :
        # Retrieve "User" and "Movie" nodes, and create relationship with the corresponding rating as property
        tx.run(statement, {"A": int(row.loc['user_id']), "B": int(row.loc['rating']), "C": int(row.loc['item_id'])})
        shouldCommit = True
        if r%100==0 : 
            tx.commit()
            print(100*r/totalLen,end='\r')
            tx = graph.begin()
            shouldCommit = False

    if shouldCommit:
        tx.commit()

    graph.run('CREATE INDEX ON :User(user_id)')
    graph.run('CREATE INDEX ON :Movie(movie_id)')
    graph.run('CREATE INDEX ON :Genre(genre_id)')

def initDB():
    addUsers()
    addGenres()
    addMovies()
    addUserMovieRels()

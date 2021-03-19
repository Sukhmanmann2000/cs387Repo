import React from 'react';
import Login from './Login';
import Register from './Register'
import Home from './Home'
import MoviePage from './MoviePage'
import AdminHome from './AdminHome'
import CriticHome from './CriticHome'
import { Route, Switch, Redirect } from 'react-router-dom';

export const Routes = () => {
    return (
        <div>
            <Switch>
                <Route exact path="/login" component={Login} />
                <Route exact path="/">
                    <Redirect to="/login" />
                </Route>
                <Route exact path="/register" component={Register} />
                <Route exact path="/home" component={Home} />
                <Route exact path="/moviePage" component={MoviePage} />
                <Route exact path="/adminHome" component={AdminHome} />
                <Route exact path="/criticHome" component={CriticHome} />
            </Switch>
        </div>
    )
};
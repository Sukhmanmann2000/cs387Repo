import React from 'react';
import App from './App';
import { Route, Switch, Redirect } from 'react-router-dom';

export const Routes = () => {
    return (
        <div>
            <Switch>
                <Route exact path="/Home" component={App} />
                <Route exact path="/">
                    <Redirect to="/Home" />
                </Route>
                <Route exact path="/App" component={App} />
            </Switch>
        </div>
    )
};
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import {Routes} from './Routes';

test('renders learn react link', () => {
  render(<Router>
      <Routes />
    </Router>);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

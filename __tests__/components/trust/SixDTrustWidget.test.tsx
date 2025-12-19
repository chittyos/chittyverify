import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { SixDTrustWidget } from '../../../client/src/components/trust/SixDTrustWidget.jsx';

const mockUser = {
  sourceScore: 0.8,
  timeScore: 0.7,
  channelScore: 0.9,
  outcomesScore: 0.6,
  networkScore: 0.8,
  justiceScore: 0.9,
  composite6DTrust: 4.7,
  fullName: 'John Doe',
  userType: 'ATTORNEY_PETITIONER'
};

describe('SixDTrustWidget', () => {
  it('renders empty state when no user provided', () => {
    render(<SixDTrustWidget />);

    expect(screen.getByText('ChittyTrust')).toBeInTheDocument();
    expect(screen.getByText('6D Trust Revolution')).toBeInTheDocument();
    expect(screen.getByText('No user selected')).toBeInTheDocument();
    expect(screen.getByText('Select a user to view their 6D Trust profile')).toBeInTheDocument();
  });

  it('renders compact view correctly', () => {
    render(<SixDTrustWidget user={mockUser} compact={true} />);

    expect(screen.getByText('4.7/6.0')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    // Should not show full detail view elements
    expect(screen.queryByText('The 6D Trust')).not.toBeInTheDocument();
    expect(screen.queryByText('Revolution')).not.toBeInTheDocument();
  });

  it('renders full view with user data', () => {
    render(<SixDTrustWidget user={mockUser} />);

    // Header elements
    expect(screen.getByText('ChittyTrust')).toBeInTheDocument();
    expect(screen.getByText('6D Trust Revolution')).toBeInTheDocument();

    // Main title
    expect(screen.getByText('The 6D Trust')).toBeInTheDocument();
    expect(screen.getByText('Revolution')).toBeInTheDocument();

    // User info
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('ATTORNEY_PETITIONER')).toBeInTheDocument();

    // Composite score
    expect(screen.getByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('Composite 6D Trust Score')).toBeInTheDocument();
  });

  it('displays all 6 trust dimensions correctly', () => {
    render(<SixDTrustWidget user={mockUser} />);

    // Check all dimension labels
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Channel')).toBeInTheDocument();
    expect(screen.getByText('Outcomes')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Justice')).toBeInTheDocument();

    // Check dimension scores (displayed with one decimal place)
    expect(screen.getByText('0.8')).toBeInTheDocument(); // sourceScore
    expect(screen.getByText('0.7')).toBeInTheDocument(); // timeScore
    expect(screen.getByText('0.9')).toBeInTheDocument(); // channelScore and justiceScore
    expect(screen.getByText('0.6')).toBeInTheDocument(); // outcomesScore
  });

  it('calculates trust percentage correctly', () => {
    render(<SixDTrustWidget user={mockUser} />);

    // Trust percentage should be (4.7 / 6) * 100 = 78.33%
    const progressElement = screen.getByRole('progressbar');
    expect(progressElement).toBeInTheDocument();
  });

  it('renders experience button', () => {
    render(<SixDTrustWidget user={mockUser} />);

    const experienceButton = screen.getByTestId('button-experience-chittytrust');
    expect(experienceButton).toBeInTheDocument();
    expect(experienceButton).toHaveTextContent('Experience ChittyTrust');
  });

  it('handles click on experience button', () => {
    render(<SixDTrustWidget user={mockUser} />);

    const experienceButton = screen.getByTestId('button-experience-chittytrust');
    fireEvent.click(experienceButton);

    // Button should be clickable (no error thrown)
    expect(experienceButton).toBeInTheDocument();
  });

  it('renders with minimum trust scores', () => {
    const minUser = {
      sourceScore: 0.0,
      timeScore: 0.0,
      channelScore: 0.0,
      outcomesScore: 0.0,
      networkScore: 0.0,
      justiceScore: 0.0,
      composite6DTrust: 0.0,
      fullName: 'Min User',
      userType: 'PARTY_PETITIONER'
    };

    render(<SixDTrustWidget user={minUser} />);

    expect(screen.getByText('0.0')).toBeInTheDocument(); // Should show 0.0 for composite
    expect(screen.getByText('Min User')).toBeInTheDocument();
  });

  it('renders with maximum trust scores', () => {
    const maxUser = {
      sourceScore: 1.0,
      timeScore: 1.0,
      channelScore: 1.0,
      outcomesScore: 1.0,
      networkScore: 1.0,
      justiceScore: 1.0,
      composite6DTrust: 6.0,
      fullName: 'Max User',
      userType: 'JUDGE'
    };

    render(<SixDTrustWidget user={maxUser} />);

    expect(screen.getByText('6.0')).toBeInTheDocument(); // Should show 6.0 for composite
    expect(screen.getByText('Max User')).toBeInTheDocument();
  });

  it('renders without optional user fields', () => {
    const basicUser = {
      sourceScore: 0.5,
      timeScore: 0.5,
      channelScore: 0.5,
      outcomesScore: 0.5,
      networkScore: 0.5,
      justiceScore: 0.5,
      composite6DTrust: 3.0
      // No fullName or userType
    };

    render(<SixDTrustWidget user={basicUser} />);

    expect(screen.getByText('3.0')).toBeInTheDocument();
    expect(screen.getByText('ChittyTrust')).toBeInTheDocument();

    // Should not show user info section
    expect(screen.queryByText('Trust Profile')).not.toBeInTheDocument();
  });

  it('displays correct description text', () => {
    render(<SixDTrustWidget user={mockUser} />);

    const description = screen.getByText(/Beyond credit scores. Beyond binary trust./);
    expect(description).toBeInTheDocument();
    expect(description).toHaveTextContent(
      'Beyond credit scores. Beyond binary trust. ChittyTrust measures what matters: Source, Time, Channel, Outcomes, Network, and Justice.'
    );
  });

  it('has correct styling classes', () => {
    render(<SixDTrustWidget user={mockUser} />);

    // Check for dark theme gradient classes
    const card = screen.getByText('ChittyTrust').closest('.bg-gradient-to-br');
    expect(card).toHaveClass('from-slate-900', 'to-slate-800', 'text-white', 'border-slate-700');
  });
});
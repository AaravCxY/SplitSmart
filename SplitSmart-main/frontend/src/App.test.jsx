import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { formatCurrency, toMinorUnits, toMajorUnits } from './utils/formatters';
import SummaryCard from './components/SummaryCard';
import LandingPage from './pages/LandingPage';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

describe('Frontend Formatter & Currency Tests', () => {
  it('formats minor currency amounts with INR symbol', () => {
    expect(formatCurrency(90000, 'INR')).toBe('₹900.00');
    expect(formatCurrency(3334, 'INR')).toBe('₹33.34');
    expect(formatCurrency(0, 'INR')).toBe('₹0.00');
  });

  it('formats negative amounts with negative sign', () => {
    expect(formatCurrency(-15000, 'INR')).toBe('-₹150.00');
  });

  it('converts major and minor units back and forth without floating point drift', () => {
    expect(toMinorUnits(900)).toBe(90000);
    expect(toMinorUnits(99.99)).toBe(9999);
    expect(toMajorUnits(90000)).toBe(900);
    expect(toMajorUnits(9999)).toBe(99.99);
  });
});

describe('SummaryCard Component', () => {
  it('renders title and formatted value correctly', () => {
    render(
      <SummaryCard
        title="Total Owed"
        value="₹300.00"
        subtitle="Outstanding"
        variant="negative"
      />
    );
    expect(screen.getByText('Total Owed')).toBeInTheDocument();
    expect(screen.getByText('₹300.00')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
  });
});

describe('LandingPage Component', () => {
  it('renders brand name and tagline', () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getAllByText(/Split/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Smart/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Shared expenses. Clear balances. Fair settlements./i)[0]).toBeInTheDocument();
  });
});

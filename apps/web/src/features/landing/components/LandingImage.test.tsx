// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LandingImage } from './LandingImage';

describe('LandingImage', () => {
  it('switches to the local fallback when an image cannot be loaded', () => {
    render(<LandingImage src="/images/landing/missing.jpg" alt="Ảnh kiểm thử" />);

    const image = screen.getByRole('img', { name: 'Ảnh kiểm thử' });
    fireEvent.error(image);

    expect(image.getAttribute('src')).toBe('/images/landing/landing-fallback-v2.jpg');
  });
});

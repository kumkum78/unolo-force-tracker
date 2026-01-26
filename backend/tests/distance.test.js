import { describe, it, expect } from 'vitest';
import { calculateDistance, checkDistanceWarning } from '../utils/distance.js';

describe('Distance Calculation Tests', () => {
  describe('Haversine Formula Accuracy', () => {
    it('should return 0km for same coordinates', () => {
      const distance = calculateDistance(28.4946, 77.0887, 28.4946, 77.0887);
      expect(distance).toBe(0);
    });

    it('should calculate known distance accurately (Gurugram test)', () => {
      // Cyber City to Sector 44 Gurugram (approximately 7.2km)
      const distance = calculateDistance(28.4946, 77.0887, 28.4595, 77.0266);
      expect(distance).toBeGreaterThan(7.0);
      expect(distance).toBeLessThan(7.5);
      expect(distance).toBeCloseTo(7.22, 1);
    });

    it('should calculate short distance accurately (<1km)', () => {
      // Very close coordinates (approximately 400m)
      const distance = calculateDistance(28.4946, 77.0887, 28.4950, 77.0890);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
      expect(distance).toBeCloseTo(0.04, 1);
    });

    it('should calculate medium distance (Delhi to Noida)', () => {
      // Gurugram to Noida (approximately 35km)
      const distance = calculateDistance(28.4595, 77.0266, 28.5707, 77.3219);
      expect(distance).toBeGreaterThan(30);
      expect(distance).toBeLessThan(40);
    });

    it('should handle negative coordinates (Southern/Western hemisphere)', () => {
      // Test with negative lat/lon (works globally)
      const distance = calculateDistance(-33.8688, 151.2093, -34.9285, 138.6007);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should return distance rounded to 2 decimal places', () => {
      const distance = calculateDistance(28.4946, 77.0887, 28.4947, 77.0952);
      const decimalPlaces = (distance.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should handle edge case: coordinates at equator', () => {
      const distance = calculateDistance(0, 0, 0, 1);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should be symmetric (A to B = B to A)', () => {
      const distanceAB = calculateDistance(28.4946, 77.0887, 28.4595, 77.0266);
      const distanceBA = calculateDistance(28.4595, 77.0266, 28.4946, 77.0887);
      expect(distanceAB).toBe(distanceBA);
    });
  });

  describe('Distance Warning Logic', () => {
    it('should warn when distance > 500m', () => {
      const distance = 0.6; // 600 meters
      const warning = checkDistanceWarning(distance);
      
      expect(warning.shouldWarn).toBe(true);
      expect(warning.message).toContain('far from the client location');
    });

    it('should not warn when distance <= 500m', () => {
      const distance = 0.4; // 400 meters
      const warning = checkDistanceWarning(distance);
      
      expect(warning.shouldWarn).toBe(false);
      expect(warning.message).toBe(null);
    });

    it('should warn at exactly 501m', () => {
      const distance = 0.501; // 501 meters
      const warning = checkDistanceWarning(distance);
      
      expect(warning.shouldWarn).toBe(true);
    });

    it('should not warn at exactly 500m (boundary)', () => {
      const distance = 0.5; // 500 meters
      const warning = checkDistanceWarning(distance);
      
      expect(warning.shouldWarn).toBe(false);
    });

    it('should allow custom threshold', () => {
      const distance = 0.3; // 300 meters
      const warning = checkDistanceWarning(distance, 200); // 200m threshold
      
      expect(warning.shouldWarn).toBe(true);
    });

    it('should handle 0km distance', () => {
      const distance = 0;
      const warning = checkDistanceWarning(distance);
      
      expect(warning.shouldWarn).toBe(false);
    });
  });
});

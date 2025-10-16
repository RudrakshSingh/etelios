const logger = require('../config/logger');

/**
 * Clinical calculation utilities for prescription management
 */

class ClinicalCalculations {
  
  /**
   * Calculate near addition power for spectacles
   * @param {Object} distanceSet - Distance prescription {r: {sph, cyl, axis}, l: {sph, cyl, axis}}
   * @param {Number} addPower - Near addition power
   * @param {Number} intermediateFactor - Factor for intermediate (default 0.5-0.7)
   * @returns {Object} - Near and intermediate power sets
   */
  static calculateNearAddition(distanceSet, addPower, intermediateFactor = 0.6) {
    try {
      const nearSet = {
        r: {
          sph: distanceSet.r.sph + addPower,
          cyl: distanceSet.r.cyl,
          axis: distanceSet.r.axis,
          va: distanceSet.r.va
        },
        l: {
          sph: distanceSet.l.sph + addPower,
          cyl: distanceSet.l.cyl,
          axis: distanceSet.l.axis,
          va: distanceSet.l.va
        }
      };

      const intermediateSet = {
        r: {
          sph: distanceSet.r.sph + (addPower * intermediateFactor),
          cyl: distanceSet.r.cyl,
          axis: distanceSet.r.axis,
          va: distanceSet.r.va
        },
        l: {
          sph: distanceSet.l.sph + (addPower * intermediateFactor),
          cyl: distanceSet.l.cyl,
          axis: distanceSet.l.axis,
          va: distanceSet.l.va
        }
      };

      return {
        near: nearSet,
        intermediate: intermediateSet,
        addPower,
        intermediateFactor
      };
    } catch (error) {
      logger.error('Error calculating near addition', { error: error.message, distanceSet, addPower });
      throw new Error('Failed to calculate near addition');
    }
  }

  /**
   * Transpose cylinder from minus to plus or vice versa
   * @param {Number} sph - Sphere power
   * @param {Number} cyl - Cylinder power
   * @param {Number} axis - Axis (0-180)
   * @param {String} mode - "PLUS" or "MINUS"
   * @returns {Object} - Transposed prescription
   */
  static transposeCylinder(sph, cyl, axis, mode = 'PLUS') {
    try {
      let newSph, newCyl, newAxis;

      if (mode === 'PLUS') {
        // Convert minus cyl to plus cyl
        newSph = sph + cyl;
        newCyl = -cyl;
        newAxis = (axis + 90) % 180;
        if (newAxis === 0) newAxis = 180;
      } else {
        // Convert plus cyl to minus cyl
        newSph = sph + cyl;
        newCyl = -cyl;
        newAxis = (axis + 90) % 180;
        if (newAxis === 0) newAxis = 180;
      }

      // Round to nearest 0.25D
      newSph = Math.round(newSph * 4) / 4;
      newCyl = Math.round(newCyl * 4) / 4;
      newAxis = Math.round(newAxis);

      return {
        sph: newSph,
        cyl: newCyl,
        axis: newAxis,
        original: { sph, cyl, axis },
        mode
      };
    } catch (error) {
      logger.error('Error transposing cylinder', { error: error.message, sph, cyl, axis, mode });
      throw new Error('Failed to transpose cylinder');
    }
  }

  /**
   * Calculate vertex distance compensation for high powers
   * @param {Number} sph - Sphere power
   * @param {Number} cyl - Cylinder power
   * @param {Number} axis - Axis
   * @param {Number} vertexChange - Vertex distance change in meters
   * @returns {Object} - Compensated prescription
   */
  static calculateVertexCompensation(sph, cyl, axis, vertexChange) {
    try {
      // Only apply for high powers (|sph| >= 4.00D)
      if (Math.abs(sph) < 4.0) {
        return { sph, cyl, axis, compensated: false, reason: 'Power too low for vertex compensation' };
      }

      // Vertex compensation formula: F_effective = F / (1 - d*F)
      const compensatedSph = sph / (1 - vertexChange * sph);
      
      // For cylinder, apply same compensation
      const compensatedCyl = cyl / (1 - vertexChange * cyl);

      // Round to nearest 0.25D
      const newSph = Math.round(compensatedSph * 4) / 4;
      const newCyl = Math.round(compensatedCyl * 4) / 4;

      return {
        sph: newSph,
        cyl: newCyl,
        axis: axis,
        original: { sph, cyl, axis },
        vertexChange,
        compensated: true,
        compensationApplied: {
          sph: compensatedSph - sph,
          cyl: compensatedCyl - cyl
        }
      };
    } catch (error) {
      logger.error('Error calculating vertex compensation', { 
        error: error.message, sph, cyl, axis, vertexChange 
      });
      throw new Error('Failed to calculate vertex compensation');
    }
  }

  /**
   * Map spectacle prescription to contact lens parameters
   * @param {Object} spectacleRx - Spectacle prescription
   * @param {String} brand - Contact lens brand
   * @param {String} series - Contact lens series
   * @param {Number} vertexDistance - Vertex distance in mm
   * @returns {Object} - Suggested contact lens parameters
   */
  static mapToContactLens(spectacleRx, brand, series, vertexDistance = 12) {
    try {
      const vertexChange = vertexDistance / 1000; // Convert mm to meters
      
      const rCompensated = this.calculateVertexCompensation(
        spectacleRx.r.sph, 
        spectacleRx.r.cyl, 
        spectacleRx.r.axis, 
        vertexChange
      );
      
      const lCompensated = this.calculateVertexCompensation(
        spectacleRx.l.sph, 
        spectacleRx.l.cyl, 
        spectacleRx.l.axis, 
        vertexChange
      );

      // Determine lens type based on cylinder
      const rCyl = Math.abs(spectacleRx.r.cyl);
      const lCyl = Math.abs(spectacleRx.l.cyl);
      const maxCyl = Math.max(rCyl, lCyl);

      let lensType = 'SPHERIC';
      if (maxCyl >= 0.75) {
        lensType = 'TORIC';
      }

      // Suggest base curve and diameter based on brand/series
      const suggestedParams = this.getContactLensParameters(brand, series, lensType);

      return {
        lensType,
        r: {
          sph: rCompensated.sph,
          cyl: rCompensated.cyl,
          axis: rCompensated.axis,
          base_curve: suggestedParams.baseCurve,
          diameter: suggestedParams.diameter
        },
        l: {
          sph: lCompensated.sph,
          cyl: lCompensated.cyl,
          axis: lCompensated.axis,
          base_curve: suggestedParams.baseCurve,
          diameter: suggestedParams.diameter
        },
        brand,
        series,
        vertexDistance,
        compensationApplied: true
      };
    } catch (error) {
      logger.error('Error mapping to contact lens', { 
        error: error.message, spectacleRx, brand, series 
      });
      throw new Error('Failed to map spectacle to contact lens');
    }
  }

  /**
   * Get contact lens parameters based on brand and series
   * @param {String} brand - Brand name
   * @param {String} series - Series name
   * @param {String} lensType - SPHERIC, TORIC, etc.
   * @returns {Object} - Suggested parameters
   */
  static getContactLensParameters(brand, series, lensType) {
    // This would typically come from a database of contact lens specifications
    const brandSpecs = {
      'ACUVUE': {
        'OASYS': { baseCurve: 8.4, diameter: 14.0 },
        'MOIST': { baseCurve: 8.4, diameter: 14.0 }
      },
      'DAILIES': {
        'TOTAL1': { baseCurve: 8.5, diameter: 14.1 },
        'AQUACOMFORT': { baseCurve: 8.6, diameter: 14.0 }
      },
      'AIR_OPTIX': {
        'PLUS': { baseCurve: 8.6, diameter: 14.2 }
      }
    };

    const defaultSpecs = { baseCurve: 8.5, diameter: 14.0 };
    
    return brandSpecs[brand]?.[series] || defaultSpecs;
  }

  /**
   * Validate prescription parameters
   * @param {Object} prescription - Prescription data
   * @returns {Object} - Validation result
   */
  static validatePrescription(prescription) {
    const errors = [];
    const warnings = [];

    // Validate sphere range
    if (prescription.r.sph < -20 || prescription.r.sph > 15) {
      errors.push('Right sphere power out of range (-20 to +15)');
    }
    if (prescription.l.sph < -20 || prescription.l.sph > 15) {
      errors.push('Left sphere power out of range (-20 to +15)');
    }

    // Validate cylinder range
    if (prescription.r.cyl < -8 || prescription.r.cyl > 0) {
      errors.push('Right cylinder power out of range (0 to -8)');
    }
    if (prescription.l.cyl < -8 || prescription.l.cyl > 0) {
      errors.push('Left cylinder power out of range (0 to -8)');
    }

    // Validate axis range
    if (prescription.r.axis < 0 || prescription.r.axis > 180) {
      errors.push('Right axis out of range (0-180)');
    }
    if (prescription.l.axis < 0 || prescription.l.axis > 180) {
      errors.push('Left axis out of range (0-180)');
    }

    // High power warnings
    if (Math.abs(prescription.r.sph) >= 4.0 || Math.abs(prescription.l.sph) >= 4.0) {
      warnings.push('High power detected - consider vertex compensation');
    }

    // High cylinder warnings
    if (Math.abs(prescription.r.cyl) >= 2.0 || Math.abs(prescription.l.cyl) >= 2.0) {
      warnings.push('High cylinder detected - consider toric contact lenses');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Round prescription to standard increments
   * @param {Number} value - Power value
   * @param {Number} increment - Rounding increment (default 0.25)
   * @returns {Number} - Rounded value
   */
  static roundToIncrement(value, increment = 0.25) {
    return Math.round(value / increment) * increment;
  }

  /**
   * Calculate prism power from decentration
   * @param {Number} power - Lens power
   * @param {Number} decentration - Decentration in mm
   * @returns {Number} - Prism power in diopters
   */
  static calculatePrismFromDecentration(power, decentration) {
    return (power * decentration) / 10; // Convert mm to cm
  }
}

module.exports = ClinicalCalculations;

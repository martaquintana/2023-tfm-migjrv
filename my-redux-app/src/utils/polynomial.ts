
/** 
 * Coefficients for the Bernstein polynomial
 * https://en.wikipedia.org/wiki/Bernstein_polynomial
 */

export const BINOMIAL_COEFF = [
    [1],            // degree 0
    [1, 1],         // degree 1
    [1, 2, 1],      // degree 2
    [1, 3, 3, 1]    // degree 3
] as const
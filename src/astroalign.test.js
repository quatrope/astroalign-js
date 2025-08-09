import { describe, it, expect } from "vitest";
import {
  arrangeTriplet,
  generateInvariants,
  findTransform,
} from "./astroalign.js";
import nudged from "nudged";

const sources = [
  [0.01, 0.02],
  [2.01, 0.13],
  [0.02, 1.05],
  [2.03, 1.02],
  [-1.05, -1.01],
  [1.02, -1.02],
  [-1.07, 0.04],
];

describe("arrangeTriplet", () => {
  it("arranges a triplet of points", () => {
    for (const vertexIndices of [
      [0, 1, 2],
      [2, 1, 0],
      [1, 2, 0],
      [2, 0, 1],
    ]) {
      expect(arrangeTriplet(sources, vertexIndices)).toEqual([0, 1, 2]);
    }

    for (const vertexIndices of [
      [4, 5, 6],
      [6, 5, 4],
      [5, 6, 4],
      [6, 4, 5],
    ]) {
      expect(arrangeTriplet(sources, vertexIndices)).toEqual([4, 5, 6]);
    }

    for (const vertexIndices of [
      [0, 1, 3],
      [3, 1, 0],
      [1, 3, 0],
      [3, 0, 1],
    ]) {
      expect(arrangeTriplet(sources, vertexIndices)).toEqual([1, 0, 3]);
    }
  });
});

describe("generateInvariants", () => {
  it("generates invariants", () => {
    const [invariants, triangVrtx] = generateInvariants(sources);

    expect(invariants.length).toEqual(29);
    expect(triangVrtx.length).toEqual(29);

    const triangVrtxSolution = [
      [2, 3, 6],
      [2, 1, 6],
      [0, 3, 6],
      [0, 1, 6],
      [1, 6, 3],
      [3, 2, 1],
      [2, 3, 0],
      [3, 5, 2],
      [0, 1, 2],
      [1, 2, 5],
      [5, 1, 0],
      [0, 3, 5],
      [5, 4, 1],
      [1, 5, 3],
      [5, 3, 4],
      [0, 1, 4],
      [1, 0, 3],
      [0, 3, 4],
      [1, 4, 3],
      [6, 0, 4],
      [6, 2, 4],
      [4, 5, 6],
      [0, 6, 2],
      [0, 5, 6],
      [2, 5, 6],
      [0, 4, 2],
      [0, 4, 5],
      [5, 2, 4],
      [0, 5, 2],
    ];

    // Convert arrays to sets of string representations for comparison
    const triangVrtxSet = new Set(
      triangVrtx.map((triplet) => JSON.stringify(triplet))
    );
    const solutionSet = new Set(
      triangVrtxSolution.map((triplet) => JSON.stringify(triplet))
    );

    // Check that both sets are the same size
    expect(triangVrtxSet.size).toBe(solutionSet.size);

    // Check that both sets contain the same elements
    const difference = new Set(
      [...triangVrtxSet].filter((x) => !solutionSet.has(x))
    );
    expect(difference.size).toBe(0);
  });
});

describe("findTransform", () => {
  it("finds transform between source and transformed destination points", () => {
    const source = [
      [1.4, 2.2],
      [5.3, 1.0],
      [3.7, 1.5],
      [10.1, 9.6],
      [1.3, 10.2],
      [7.1, 2.0],
    ];

    const nsrc = source.length;
    const scale = 1.5; // scaling parameter
    const alpha = Math.PI / 8.0; // rotation angle

    // Create transformation matrix
    const mm = [
      [scale * Math.cos(alpha), -scale * Math.sin(alpha)],
      [scale * Math.sin(alpha), scale * Math.cos(alpha)],
    ];

    const tx = 2.0,
      ty = 1.0; // translation parameters

    // Apply transformation to source points
    const dest = source.map(([x, y]) => {
      const newX = mm[0][0] * x + mm[0][1] * y + tx;
      const newY = mm[1][0] * x + mm[1][1] * y + ty;
      return [newX, newY];
    });

    // Shuffle destination points to disorder them
    const shuffledDest = [...dest];
    for (let i = shuffledDest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDest[i], shuffledDest[j]] = [shuffledDest[j], shuffledDest[i]];
    }

    // Test find_transform function
    const [t_est, [src_controlp, dst_controlp]] = findTransform(
      source,
      shuffledDest
    );

    // Test that the estimated transform matches the expected parameters
    expect(
      Math.abs(scale - nudged.transform.getScale(t_est))
    ).toBeLessThanOrEqual(1e-10);
    expect(
      Math.abs(alpha - nudged.transform.getRotation(t_est))
    ).toBeLessThanOrEqual(1e-10);

    // Test translation - convert to nudged points for comparison
    const expectedTranslation = nudged.point.fromArray([tx, ty]);
    const actualTranslation = nudged.transform.getTranslation(t_est);
    const translationDiff = nudged.point.distance(
      expectedTranslation,
      actualTranslation
    );
    expect(translationDiff).toBeLessThanOrEqual(1e-10);

    // Test that the transformation maps well src_controlp into dst_controlp
    const error = nudged.analysis.residuals(
      t_est,
      src_controlp.map((p) => nudged.point.fromArray(p)),
      dst_controlp.map((p) => nudged.point.fromArray(p))
    );
    expect(Math.max(...error)).toBeLessThan(1e-10);
  });
});

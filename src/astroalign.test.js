import { describe, it, expect } from "vitest";
import { arrangeTriplet, generateInvariants } from "./astroalign.js";

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

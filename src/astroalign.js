// MIT License
//
// Copyright (c) 2016 Martin Beroiz
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import createKDTree from "static-kdtree";
import nudged from "nudged";

const NUM_NEAREST_NEIGHBORS = 5;
const MIN_MATCHES_FRACTION = 0.8;
const PIXEL_TOL = 2;

function register(image1, image2) {
  console.log("Registering images");
  return image1 + image2;
}

/**
 * Given 3 points x1, x2, x3, return the invariant features for the set.
 * @param {number[]} x1 - First point coordinates [x, y]
 * @param {number[]} x2 - Second point coordinates [x, y]
 * @param {number[]} x3 - Third point coordinates [x, y]
 * @returns {number[]} Array of two invariant features [ratio1, ratio2]
 */
function invariantFeatures(x1, x2, x3) {
  // Calculate the Euclidean squared distances between all pairs of points
  const sides = [
    (x1[0] - x2[0]) ** 2 + (x1[1] - x2[1]) ** 2,
    (x2[0] - x3[0]) ** 2 + (x2[1] - x3[1]) ** 2,
    (x1[0] - x3[0]) ** 2 + (x1[1] - x3[1]) ** 2,
  ];

  // Sort the sides in ascending order
  sides.sort((a, b) => a - b);

  // Return the invariant features: [longest/middle, middle/shortest]
  return [Math.sqrt(sides[2] / sides[1]), Math.sqrt(sides[1] / sides[0])];
}

/**
 * Order vertex_indices according to length side.
 *
 * Order in (a, b, c) form Where:
 *   a is the vertex defined by L1 & L2
 *   b is the vertex defined by L2 & L3
 *   c is the vertex defined by L3 & L1
 * and L1 < L2 < L3 are the sides of the triangle
 * defined by vertex_indices.
 *
 * @param {number[][]} sources - Array of source points
 * @param {number[]} vertexIndices - Array of three vertex indices
 * @returns {number[]} Array of three indices [a, b, c] representing the ordered vertices
 */
function arrangeTriplet(sources, vertexIndices) {
  const [ind1, ind2, ind3] = vertexIndices;
  const x1 = sources[ind1];
  const x2 = sources[ind2];
  const x3 = sources[ind3];

  // Define the sides as pairs of vertex indices
  const sideInd = [
    [ind1, ind2],
    [ind2, ind3],
    [ind3, ind1],
  ];

  // Calculate side lengths using Euclidean distance
  const sideLengths = [
    Math.sqrt((x1[0] - x2[0]) ** 2 + (x1[1] - x2[1]) ** 2),
    Math.sqrt((x2[0] - x3[0]) ** 2 + (x2[1] - x3[1]) ** 2),
    Math.sqrt((x3[0] - x1[0]) ** 2 + (x3[1] - x1[1]) ** 2),
  ];

  // Get indices sorted by side length of side (i, i+1)
  const sortedIndices = sideLengths
    .map((length, index) => ({ length, index }))
    .sort((a, b) => a.length - b.length)
    .map((item) => item.index);

  const [l1Ind, l2Ind, l3Ind] = sortedIndices;

  // Helper function to find most common element (equivalent to Counter.most_common)
  function mostCommon(arr) {
    const count = {};
    arr.forEach((item) => {
      count[item] = (count[item] || 0) + 1;
    });
    return Object.entries(count).sort((a, b) => b[1] - a[1]);
  }

  // Find the most common vertex in the list of vertices for two sides
  // This is the point at which they meet
  const a = mostCommon([...sideInd[l1Ind], ...sideInd[l2Ind]]);
  const b = mostCommon([...sideInd[l2Ind], ...sideInd[l3Ind]]);
  const c = mostCommon([...sideInd[l3Ind], ...sideInd[l1Ind]]);

  return [parseInt(a), parseInt(b), parseInt(c)];
}

/**
 * Return an array of (unique) invariants derived from the array `sources`.
 *
 * Return an array of the indices of `sources` that correspond to each
 * invariant, arranged as described in arrangeTriplet.
 *
 * @param {number[][]} sources - Array of source points
 * @param {number} NUM_NEAREST_NEIGHBORS - Number of nearest neighbors to consider
 * @returns {[number[][], number[][]]} Array containing [invariants, triangleVertices]
 */
function generateInvariants(sources) {
  // Create a partial function equivalent (arrange with sources bound)
  const arrange = (vertexIndices) => arrangeTriplet(sources, vertexIndices);

  const inv = [];
  const triangVrtx = [];
  // Create KDTree from sources
  const coordTree = createKDTree(sources);
  // The number of nearest neighbors to request (to work with few sources)
  const knn = Math.min(sources.length, NUM_NEAREST_NEIGHBORS);
  for (const asrc of sources) {
    // Query nearest neighbors
    const indx = coordTree.knn(asrc, knn);
    // Generate all possible triangles with the knn indices provided
    const combinations = [];
    for (let i = 0; i < indx.length - 2; i++) {
      for (let j = i + 1; j < indx.length - 1; j++) {
        for (let k = j + 1; k < indx.length; k++) {
          combinations.push([indx[i], indx[j], indx[k]]);
        }
      }
    }

    // Store triangles with the order (a, b, c) defined in arrangeTriplet
    const allAsterismTriang = combinations.map((vertexIndices) =>
      arrange(vertexIndices)
    );
    triangVrtx.push(...allAsterismTriang);

    // Generate invariants for each triangle
    const triangleInvariants = allAsterismTriang.map((triplet) =>
      invariantFeatures(...triplet.map((i) => sources[i]))
    );
    inv.push(...triangleInvariants);
  }

  // Remove all possible duplicate triangles
  const uniqInd = [];
  for (let pos = 0; pos < inv.length; pos++) {
    const elem = inv[pos];
    const isDuplicate = inv
      .slice(pos + 1)
      .some((item) => item[0] === elem[0] && item[1] === elem[1]);
    if (!isDuplicate) {
      uniqInd.push(pos);
    }
  }

  const invUniq = uniqInd.map((i) => inv[i]);
  const triangVrtxUniq = uniqInd.map((i) => triangVrtx[i]);

  return [invUniq, triangVrtxUniq];
}

/**
 * Class for matching and transforming between source and target point sets.
 */
class MatchTransform {
  /**
   * Initialize with source and target point sets.
   * @param {number[][]} source - Source points
   * @param {number[][]} target - Target points
   */
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  /**
   * Return the best 2D similarity transform from the points given in data.
   *
   * @param {number[][][]} data - N sets of similar corresponding triangles.
   *   3 indices for a triangle in ref and the 3 indices for the corresponding
   *   triangle in target; arranged in a (N, 3, 2) array.
   * @returns {Object} The estimated transform object
   */
  fit(data) {
    const sourcePoints = data
      .flat()
      .map(([s, t]) => nudged.point.fromArray(this.source[s]));
    const targetPoints = data
      .flat()
      .map(([s, t]) => nudged.point.fromArray(this.target[t]));

    // Estimate similarity transform
    const approxT = nudged.estimate({
      estimator: "TSR",
      domain: sourcePoints,
      range: targetPoints,
    });
    return approxT;
  }

  /**
   * Calculate the error for a given transform and data.
   *
   * @param {number[][][]} data - Triangle correspondence data
   * @param {Object} approxT - The estimated transform object
   * @returns {number[]} Array of maximum residuals for each triangle
   */
  getError(data, approxT) {
    const residuals = data.map((triangle) => {
      const sourcePoints = triangle.map(([s, t]) =>
        nudged.point.fromArray(this.source[s])
      );
      const targetPoints = triangle.map(([s, t]) =>
        nudged.point.fromArray(this.target[t])
      );
      const r = nudged.analysis.residuals(approxT, sourcePoints, targetPoints);
      return Math.max(...r);
    });
    return residuals;
  }
}

function data(data) {
  return data;
}

function bw(data) {
  return data;
}

/**
 * Estimate the transform between source and target.
 *
 * Returns a transform object that maps pixel x, y indices from the source image
 * into the target (destination) image.
 *
 * @param {number[][]|Object} source - Source image array or array of (x, y) coordinates
 * @param {number[][]|Object} target - Target image array or array of (x, y) coordinates
 * @param {number} maxControlPoints - Maximum number of control points to find
 * @param {number} detectionSigma - Factor of background std-dev above which is considered a detection
 * @param {number} minArea - Minimum number of connected pixels to be considered a source
 * @returns {[Object, [number[][], number[][]]]} Transform object and tuple of corresponding positions
 */
function findTransform(
  source,
  target,
  maxControlPoints = 50,
  detectionSigma = 5,
  minArea = 5
) {
  let sourceControlP, targetControlP;

  try {
    const sourceData = data(source);
    if (sourceData[0] && sourceData[0].length === 2) {
      // Assume it's a list of (x, y) pairs
      sourceControlP = sourceData.slice(0, maxControlPoints);
    } else {
      // Assume it's a 2D image
      sourceControlP = _findSources(bw(data(source)), {
        detectionSigma: detectionSigma,
        minArea: minArea,
        maxControlPoints: maxControlPoints,
      });
    }
  } catch (error) {
    throw new TypeError("Input type for source not supported.");
  }

  try {
    const targetData = data(target);
    if (targetData[0] && targetData[0].length === 2) {
      // Assume it's a list of (x, y) pairs
      targetControlP = targetData.slice(0, maxControlPoints);
    } else {
      // Assume it's a 2D image
      targetControlP = _findSources(bw(data(target)), {
        detectionSigma: detectionSigma,
        minArea: minArea,
        maxControlPoints: maxControlPoints,
      });
    }
  } catch (error) {
    throw new TypeError("Input type for target not supported.");
  }

  // Check for low number of reference points
  if (sourceControlP.length < 3) {
    throw new Error(
      "Reference stars in source image are less than the minimum value (3)."
    );
  }
  if (targetControlP.length < 3) {
    throw new Error(
      "Reference stars in target image are less than the minimum value (3)."
    );
  }

  const [sourceInvariants, sourceAsterisms] =
    generateInvariants(sourceControlP);
  const sourceInvariantTree = createKDTree(sourceInvariants);

  const [targetInvariants, targetAsterisms] =
    generateInvariants(targetControlP);
  const targetInvariantTree = createKDTree(targetInvariants);

  // r = 0.1 is the maximum search distance, 0.1 is an empirical value that
  // returns about the same number of matches than inputs
  // matchesList is a list of lists such that for each element
  // sourceInvariantTree.data[i], matchesList[i] is a list of the indices
  // of its neighbors in targetInvariantTree.data
  const matchesList = Array.from(
    { length: sourceInvariants.length },
    () => []
  );
  const matchRadius = 0.1; // in invariant space units
  sourceInvariants.forEach((sourceInv, sourceInd) => {
    targetInvariantTree.rnn(sourceInv, matchRadius, function (targetInd) {
      matchesList[sourceInd].push(targetInd);
    });
  });

  // matches unravels the previous list of matches into pairs of source and
  // target control point matches.
  // matches is a (N, 3, 2) array. N sets of similar corresponding triangles.
  // 3 indices for a triangle in ref and the 3 indices for the corresponding triangle in target;
  const matches = [];
  // t1 is an asterism in source, t2 in target
  for (let i = 0; i < sourceAsterisms.length; i++) {
    const t1 = sourceAsterisms[i];
    const t2List = matchesList[i];
    for (const t2Idx of t2List) {
      const t2 = targetAsterisms[t2Idx];
      const match = t1.map((sIdx, j) => [sIdx, t2[j]]);
      matches.push(match);
    }
  }

  const invModel = new MatchTransform(sourceControlP, targetControlP);
  const nInvariants = matches.length;
  // Set the minimum matches to be between 1 and 10 asterisms
  const minMatches = Math.max(
    1,
    Math.min(10, Math.floor(nInvariants * MIN_MATCHES_FRACTION))
  );

  let bestT, inlierInd;

  if (
    (sourceControlP.length === 3 || targetControlP.length === 3) &&
    matches.length === 1
  ) {
    bestT = invModel.fit(matches);
    inlierInd = Array.from({ length: matches.length }, (_, i) => i); // All of the indices
  } else {
    [bestT, inlierInd] = ransac(matches, invModel, PIXEL_TOL, minMatches);
  }

  const triangleInliers = inlierInd.map((i) => matches[i]).flat();

  // Turn into a dictionary to remove duplicates
  const inlUniqueDict = Object.fromEntries(
    triangleInliers.map((match) => [JSON.stringify(match), match])
  );
  const inlUnique = Object.values(inlUniqueDict);

  // In the next, multiple assignments to the same source point s are removed
  // We keep the pair (s, t) with the lowest reprojection error.
  const inlDict = {};
  for (const [sI, tI] of inlUnique) {

    // calculate error
    const sVertex = sourceControlP[sI];
    const tVertex = targetControlP[tI];

    const error = nudged.analysis.residuals(
      bestT,
      [nudged.point.fromArray(sVertex)],
      [nudged.point.fromArray(tVertex)]
    )[0];

    // if sI not in dict, or if its error is smaller than previous error
    if (!(sI in inlDict) || error < inlDict[sI][1]) {
      inlDict[sI] = [tI, error];
    }
  }

  // Clean up and make an array of unique (source, taget) indices
  const inlArrUnique = Object.entries(inlDict).map(([sI, [tI, e]]) => [
    parseInt(sI),
    tI,
  ]);

  return [
    bestT,
    [
      inlArrUnique.map(([i, j]) => sourceControlP[i]),
      inlArrUnique.map(([i, j]) => targetControlP[j]),
    ],
  ];
}

/**
 * Fit model parameters to data using the RANSAC algorithm.
 *
 * This implementation written from pseudocode found at
 * http://en.wikipedia.org/w/index.php?title=RANSAC&oldid=116358182
 *
 * @param {Array} data - A set of data points
 * @param {Object} model - A model that can be fitted to data points
 * @param {number} thresh - A threshold value to determine when a data point fits a model
 * @param {number} minMatches - The min number of matches required to assert that a model fits well to data
 * @returns {[Object, number[]]} Array containing [bestfit, bestInlierIdxs] where bestfit is model parameters which best fit the data (or null if no good model is found)
 */
function ransac(data, model, thresh, minMatches) {
  let goodFit = null;
  const nData = data.length;
  const allIdxs = Array.from({ length: nData }, (_, i) => i);

  // Shuffle the indices
  for (let i = allIdxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIdxs[i], allIdxs[j]] = [allIdxs[j], allIdxs[i]];
  }

  for (let iterI = 0; iterI < nData; iterI++) {
    // Partition indices into two random subsets
    const maybeIdxs = allIdxs.slice(iterI, iterI + 1);
    const testIdxs = [
      ...allIdxs.slice(0, iterI),
      ...allIdxs.slice(iterI + 1),
    ];

    const maybeInliers = maybeIdxs.map((i) => data[i]);
    const testPoints = testIdxs.map((i) => data[i]);
    const maybeModel = model.fit(maybeInliers);
    const testErr = model.getError(testPoints, maybeModel);

    // Select indices of rows with accepted points
    const alsoIdxs = testIdxs.filter((_, i) => testErr[i] < thresh);
    const alsoInliers = alsoIdxs.map((i) => data[i]);

    if (alsoInliers.length >= minMatches) {
      const goodData = [...maybeInliers, ...alsoInliers];
      goodFit = model.fit(goodData);
      break;
    }
  }

  if (goodFit === null) {
    throw new Error(
      "List of matching triangles exhausted before an acceptable " +
        "transformation was found"
    );
  }

  let betterFit = goodFit;
  let betterInlierIdxs = [];

  for (let i = 0; i < 3; i++) {
    const testErr = model.getError(data, betterFit);
    betterInlierIdxs = Array.from({ length: nData }, (_, i) => i).filter(
      (i) => testErr[i] < thresh
    );
    const betterData = betterInlierIdxs.map((i) => data[i]);
    betterFit = model.fit(betterData);
  }

  const bestFit = betterFit;
  const bestInlierIdxs = betterInlierIdxs;

  return [bestFit, bestInlierIdxs];
}

export {
  register,
  arrangeTriplet,
  generateInvariants,
  MatchTransform,
  findTransform,
  ransac,
};

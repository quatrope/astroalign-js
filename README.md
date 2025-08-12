# Astroalign JS

**Note:** This is a work in progress, only `findTransform` function works at the moment.

ASTROALIGN is a library that will try to align two stellar astronomical images taken in different orientations.

It does so by finding similar 3-point asterisms (triangles) in both images and deducing the affine transformation between them.

Generic registration routines try to match feature points, using corner detection routines to make the point correspondence. These generally fail for stellar astronomical images, since stars have very little stable structure and so, in general, indistinguishable from each other. Asterism matching is more robust, and closer to the human way of matching stellar images.

Astroalign can match images of different field of view, point-spread function, seeing and atmospheric conditions.

It may not work, or work with special care, on images of extended objects with few point-like sources or in very crowded fields.

## Installation

Install from NPM

```bash
npm install astroalign
```

## Running Tests

```bash
npm run test
```

## Usage example

```js
const { findTransform } = await import("astroalign");
const sourcePoints = [
  [ 105, 165 ],
  [ 397.5, 75 ],
  [ 277.5, 112.5 ],
  [ 757.5, 720 ],
  [ 97.5, 765 ],
  [ 532.5, 150 ]
];
const targetPoints = [
  [ 509.81, 333.11 ],
  [ -302.01, 1117.12 ],
  [ 638.46, 1433.61 ],
  [ 653.85, 514.54 ],
  [ 321.99, 316.20 ],
  [ 52.80, 289.93 ]
];
const [transf, [sourceList, targetList]] = findTransform(sourcePoints, targetPoints);
```

Where `transf` is a [nudged](https://www.npmjs.com/package/nudged) TSR transformation.

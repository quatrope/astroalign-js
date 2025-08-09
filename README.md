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
const source_points = [
  [0.01, 0.02],
  [2.01, 0.13],
  [0.02, 1.05],
  [2.03, 1.02],
  [-1.05, -1.01],
  [1.02, -1.02],
  [-1.07, 0.04],
];
const target_points = [
  [ 2.67, 4.85 ],
  [ 8.77, 5.428 ],
  [ 6.26, 5.20 ],
  [ 10.48, 20.10 ],
  [ -2.05, 15.88 ],
  [ 10.69, 7.85 ]
]
const [transf, [source_list, target_list]] = findTransform(source_points, target_points);
```

Where `t_est` is a [nudged](https://www.npmjs.com/package/nudged) TSR transformation.

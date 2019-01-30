# Hyperbolic Crystal Ball (a.k.a. hyperbolic fish-eye)
A ``crystal ball'' for viewing graphs (or just point configurations) in  2-dimensional hyperbolic space, using the Poincaré disc model.  Draws edges as geodesic arcs.
All computation is performed in the hyperboloid model (for computation).
Entirely client-side.

## Usage
Just open `index.html`.

## Functionality
  Drag all the points by dragging the ambient, or drag the points individually.
You can use your own point and edge configurations by simply dropping them into the appropriate textareas and hitting the "update" button.  Points entered in this way should be on the hyperboloid.

## Limitations

+ As all computation is in client-side JavaScript, performance may be lagging for large graphs.
+ Numerical stability is lower when points are further away from the centre of the Poincaré disc.

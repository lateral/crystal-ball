# Hyperbolic Crystal Ball (a.k.a. hyperbolic fish-eye)
A "crystal ball" for viewing graphs (or just point configurations) in 2-dimensional hyperbolic space, using the Poincaré disc model.  Edges are drawn as geodesic arcs.
All computation is performed client-side, in JavaScript, mostly using the hyperboloid model.

## Uses
The crystal ball is a useful way to inspect hyperbolic embeddings e.g. resulting from graph embeddings or multi-dimensional scaling.  It is also a great way to get an understanding of the distortion that is inherent in the Poincaré disc model. 

## Hosted version
A hosted version is available [here](https://crystal-ball.lateral.io/), but it is very easy to run it locally.

## Usage
Just point your web browser to `index.html` (e.g. via `File > Open File ...`).

## Requirements
There are no external software dependencies.  Your web browser needs to be able to render HTML5 (all modern browsers can do this) and have JavaScript enabled (it usually is, by default).

## Functionality

+ The entire graph or point configuration can be translated or rotated by dragging the ambient. ![](img/drag-ambient.gif)
+ Individual points can be moved by clicking and dragging.  Movements always follow geodesic arcs (the one that is tangent to the displacement induced by the drag).  Edges are attached to the points, so they follow any changes. ![](img/drag-individual.gif)
+ Point and edge configurations can be loaded by simply pasting them into the textareas and hitting the "update" button.  Either hyperboloid or Poincaré disc coordinates can be used. ![](img/load-data.gif)

## Limitations

+ As all computation is in client-side JavaScript, performance may be poor for large graphs.
+ Numerical stability is lower when points are further away from the centre of the Poincaré disc.

## Tests
Unit testing is performed using [QUnit](https://qunitjs.com/) and [qunit-assert-close](https://github.com/JamesMGreene/qunit-assert-close) (both bundled). To run the unit tests in your browser, open `run_tests.html`.  Opening this page runs the tests in your browser.

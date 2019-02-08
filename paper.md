---
title: 'A Hyperbolic Crystal Ball'
tags:
  - hyperbolic-geometry
  - embeddings
  - javascript
authors:
  - name: Benjamin Wilson
    orcid: 0000-0002-3708-0361
    affiliation: "1"
affiliations:
 - name: Lateral GmbH
   index: 1
date: 1 February 2019
bibliography: paper.bib
---

# Summary

Several recent works have presented methods for embeddings graphs [@chamberlain_2017] [@nickel_kiela_2017] [@NickelKiela2018] and words [@leimeister2018skipgram] [@Dhingra2018] in hyperbolic space.
The [Hyperbolic Crystal Ball](https://github.com/lateral/crystal-ball) provides researchers in machine learning with a much-needed mechanism for inspecting the hyperbolic embeddings resulting from their algorithms using a navigable visualisation on the Poincaré disc.
Consisting entirely of client-side JavaScript, the software can locally in any modern web browser.

The Poincaré disc displays the entirety of the hyperbolic plane within the unit disc.  In practice, however, due to the finite resolution of both the computer display and the eye, points that are far from the focal point of the disc are no longer visible.  Such point configurations occur frequently in hyperbolic embeddings, however.  The ``hyperbolic crystal ball`` is built to address this problem.  It provides a navigation mechanism for the hyperbolic plane, allowing the user to visit and explore far-off constellations of points.  This is achieved via simple dragging motions on the Poincaré disc.  These are able to effect arbitrary rotations and translations of the entire point configuration.

In addition to this primary use case, the hyperbolic crystal ball is a useful tool for gaining an intuitive understanding of hyperbolic space and of the Poincaré disc model in particular.  To this end, a point-dragging functionality is included.  This permits the formation of arbitrary polygons, with edges being represented by geodesic arcs.  Viewing such polygons from various perspectives, by applying translations and rotations, provides an understanding of the deformations inherent in the Poincaré disc model.

# Computational geometry on the hyperbolic plane

There are various models of the hyperbolic plane.  While the Poincaré disc model is used for display, the geometric computations of the crystal ball are carried out using the hyperboloid model.  The exception to this is the calculation of a geodesic line segment, which is acheived using circle inversion through the boundary of the Poincaré disc.

The point configuration can be manipulated either by dragging individual points or by dragging all points simultaneously.  The computations entailed involve the exponential, logarithm and geodesic parallel-transport maps on the hyperboloid.  The formulae for these maps are well-known, and can be found e.g. in [@leimeister2018skipgram].  Equipped with these maps, the user interaction and the consequent computations are as follows:

**Dragging an individual point**:  The point is selected by holding down the mouse botton, but is not moved until the mouse button is released.  While the mouse button is held down, the position to which the point would be mapped is indicated, along with the geodesic line segment connecting the current and updated versions of the point.  The position of the mouse during drag specifies the tangent to the geodesic line along which it would move.  The new position of the point is then the exponential of this tangent (after conformal scaling), computed at its original position.

**Dragging all points**: All points can be dragged simultaneously by dragging the background of the Poincaré disc.  The positions of all points are continuously updated while the mouse button is held down.  If `X` was the mouse position last round, and `Y` is the current mouse position, then the update is calculated as follows:
 + the logarithm of each point of the configuration is computed at `X`, yielding tangent vectors at `X`; 
 + these are then parallel-transported along the geodesic connecting `X` to `Y`, yielding tangent vectors at `Y`; 
 + the exponential map at `Y` is applied to these tangent vectors, mapping the points of the configuration to their updated positions.

# References

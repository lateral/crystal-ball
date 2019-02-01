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

Several recent works have presented methods for embeddings graphs [@chamberlain_2017] [@nickel_kiela_2017] [@NickelKiela2018] and words [@leimeister2018skipgram] [@Dhingra2018] in hyperbolic space.  Created for those experimenting with hyperbolic embeddings, the (Hyperbolic Crystal Ball)[https://github.com/lateral/crystal-ball] provides a mechanism for exploring these embeddings using the Poincaré disc model.  Consisting entirely of client-side JavaScript, the software can locally in any modern web browser.

The Poincaré disc displays the entirety of the hyperbolic plane within the unit disc.  In practice, however, due to the finite resolution of both the computer display and the eye, points that are far from the focal point of the disc are no longer visible.  Such point configurations occur frequently in hyperbolic embeddings, however.  The ``hyperbolic crystal ball`` is built to address this problem.  It provides a navigation mechanism for the hyperbolic plane, allowing the user to visit and explore far-off constellations of points.  This is achieved via simple dragging motions on the Poincaré disc.  These are able to effect arbitrary rotations and translations of the entire point configuration.

In addition to this primary use case, the hyperbolic crystal ball is a useful tool for gaining an intuitive understanding of hyperbolic space and of the Poincaré disc model in particular.  To this end, a point-dragging functionality is included.  This permits the formation of arbitrary polygons, with edges being represented by geodesic arcs.  Viewing such polygons from various perspectives, by applying translations and rotations, provides an understanding of the deformations inherent in the Poincaré disc model.

# References
